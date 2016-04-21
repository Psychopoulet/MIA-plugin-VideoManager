
"use strict";

// deps

	const	path = require('path'),
			fs = require('simplefs'),
			SimplePluginsManager = require('simplepluginsmanager');

// private

	function _formateVideo(video) {

		if (-1 < video.url.indexOf('youtu')) {

			if (!video.code || '' == video.code) {

				if (-1 == video.url.indexOf('=')) {
					video.url = video.url.replace('youtu.be/', 'youtube.com/watch?v=');
				}

				video.code = video.url.replace(/&(.*)/, '').split('=')[1];
				
			}

			video.url = 'https://www.youtube.com/watch?v=' + video.code;
			video.urlembeded = 'https://www.youtube.com/embed/' + video.code;

		}
		else if (-1 < video.url.indexOf('dailymotion')) {

			if (!video.code || '' == video.code) {
				let parts = video.url.split('_')[0].split('/');
				video.code = parts[parts.length-1];
			}

			video.url = 'https://www.dailymotion.com/video/' + video.code;
			video.urlembeded = 'https://www.dailymotion.com/embed/video/' + video.code;

		}

		return video;

	}

	function _freeSocket(socket) {

		// categories

			socket.removeAllListeners('plugins.videos.category.add');
			socket.removeAllListeners('plugins.videos.category.edit');
			socket.removeAllListeners('plugins.videos.category.delete');

		// videos

			socket.removeAllListeners('plugins.videos.videos');

			socket.removeAllListeners('plugins.videos.video.add');
			socket.removeAllListeners('plugins.videos.video.edit');
			socket.removeAllListeners('plugins.videos.video.delete');

			socket.removeAllListeners('plugins.videos.video.playsound');
			socket.removeAllListeners('plugins.videos.video.playvideo');

	}

// module

module.exports = class MIAPluginVideosManager extends SimplePluginsManager.SimplePlugin {

	constructor () {

		super();

		this.categories = [];
		this.backupFilePath = path.join(__dirname, 'backup.json');

	}

	loadData () {

		let that = this;

		return new Promise(function(resolve, reject) {

			try {

				fs.isFileProm(that.backupFilePath).then(function(exists) {

					if (exists) {
						resolve(that.categories);
					}
					else {

						fs.readFileProm(that.backupFilePath, 'utf8').then(function(content) {

							try {
								that.categories = JSON.parse(content);
								resolve(that.categories);
							}
							catch (e) {
								reject('Impossible de lire les données enregistrée : ' + ((e.message) ? e.message : e) + '.');
							}

						}).catch(function(err) {
							reject('Impossible de lire les données enregistrée : ' + err + '.');
						});

					}

				}).catch(function(err) {
					reject('Impossible de lire les données enregistrée : ' + err + '.');
				});

			}
			catch(e) {
				reject((e.message) ? e.message : e);
			}

		});

	}

	saveData () {

		let that = this;

		return new Promise(function(resolve, reject) {

			try {

				fs.writeFileProm(that.backupFilePath, JSON.stringify(that.categories), 'utf8').then(resolve).catch(function(err) {
					reject('Impossible de sauvegarder les données : ' + err + '.');
				});

			}
			catch (e) {
				reject('Impossible de sauvegarder les données : ' + ((e.message) ? e.message : e) + '.');
			}

		});

	}

	loadCategories (Container) {

		let tabCategories = [];

		try {

			if (this.categories && 0 < this.categories.length) {

				this.categories.forEach(function(category) {

					tabCategories.push({
						code : category.code,
						name : category.name
					});

				});

				Container.get('websockets').emit('plugins.videos.categories', tabCategories);
				
			}
			else {

				this.loadData().then(function(categories) {

					categories.forEach(function(category) {

						tabCategories.push({
							code : category.code,
							name : category.name
						});

					});

					Container.get('websockets').emit('plugins.videos.categories', tabCategories);

				})
				.catch(function(err) {
					Container.get('logs').err('-- [plugins/VideosManager] - loadCategories : ' + ((err.message) ? err.message : err));
					socket.emit('plugins.videos.error', (err.message) ? err.message : err);
				});

			}

		}
		catch(e) {
			Container.get('logs').err('-- [plugins/VideosManager/] - loadCategories : ' + ((e.message) ? e.message : e));
			Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
		}

	}

	loadVideosByCategory (Container, p_stCategory) {

		let tabVideos = [];

		try {

			this.categories.forEach(function(category) {

				if (category.code === p_stCategory.code) {
					tabVideos = category.videos;
				}

			});

			Container.get('websockets').emit('plugins.videos.videos', tabVideos);

		}
		catch(e) {
			Container.get('logs').err('-- [plugins/VideosManager] - loadVideosByCategory : ' + ((e.message) ? e.message : e));
			Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
		}

	}

	load (Container) {

		let that = this;

		return new Promise(function(resolve, reject) {

			Container.get('websockets').onDisconnect(_freeSocket).onLog(function(socket) {

				that.loadCategories(Container);

				// categories

					socket.on('plugins.videos.category.add', function (data) {

						if (Container.get('conf').get('debug')) {
							Container.get('logs').log('plugins.videos.category.add');
						}

						let bFound = false;

						try {

							that.categories.forEach(function(category) {

								if (category.code === data.code) {
									bFound = true;
								}

							});

							if (bFound) {
								socket.emit('plugins.videos.error', 'Cette catégorie existe déjà.');
							}
							else {
								
								data = {
									code : data.name,
									name : data.name,
									videos : []
								};

								that.categories.push(data);

								that.saveData().then(function() {

									Container.get('websockets').emit('plugins.videos.category.added', {
										code : data.name,
										name : data.name
									});

								})
								.catch(function(err) {
									Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.category.add : ' + err);
									socket.emit('plugins.videos.error', err);
								});

							}

						}
						catch (e) {
							Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.category.add : ' + ((e.message) ? e.message : e));
							Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
						}

					})
					.on('plugins.videos.category.edit', function (data) {

						if (Container.get('conf').get('debug')) {
							Container.get('logs').log('plugins.videos.category.edit');
						}

						let bFound = false;

						try {

							that.categories.forEach(function(category, key) {

								if (category.code === data.code) {
									bFound = true;
									that.categories[key].name = data.name;
								}

							});

							if (!bFound) {
								socket.emit('plugins.videos.error', 'Impossible de trouver cette catégorie.');
							}
							else {

								that.saveData().then(function() {

									Container.get('websockets').emit('plugins.videos.category.edited', {
										code : data.code,
										name : data.name
									});

								})
								.catch(function(err) {
									Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.category.edit : ' + err);
									socket.emit('plugins.videos.error', err);
								});

							}

						}
						catch (e) {
							Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.category.edit : ' + ((e.message) ? e.message : e));
							Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
						}

					})
					.on('plugins.videos.category.delete', function (data) {

						if (Container.get('conf').get('debug')) {
							Container.get('logs').log('plugins.videos.category.delete');
						}

						try {

							that.categories.forEach(function(category, key) {

								if (category.code === data.code) {
									that.categories.splice(key, 1);
								}

							});

							that.saveData().then(function() { that.loadCategories(Container); })
							.catch(function(err) {
								Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.category.delete : ' + err);
								socket.emit('plugins.videos.error', err);
							});

						}
						catch (e) {
							Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.category.delete : ' + ((e.message) ? e.message : e));
							Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
						}

					});

				// videos

					socket.on('plugins.videos.videos', function(p_stCategory) { that.loadVideosByCategory(Container, p_stCategory); })

					.on('plugins.videos.video.add', function (data) {

						if (Container.get('conf').get('debug')) {
							Container.get('logs').log('plugins.videos.video.add');
						}

						try {

							if (!data || !data.video || !data.video.name || !data.video.url) {
								socket.emit('plugins.videos.error', 'Des données sont manquantes.');
							}
							else {

								let bCategoryFound = false, stVideo = false;

									that.categories.forEach(function(category, key) {

										if (category.code === data.category.code) {

											bCategoryFound = true;

											stVideo = _formateVideo(data.video);

											category.videos.forEach(function(video, vidkey) {

												if (video.code === stVideo.code) {
													stVideo = false;
												}

											});

											if (stVideo) {
												that.categories[key].videos.push(stVideo);
											}

										}

									});

								if (!bCategoryFound) {
									socket.emit('plugins.videos.error', 'Impossible de trouver cette catégorie.');
								}
								else if (!stVideo) {
									socket.emit('plugins.videos.error', 'Cette vidéo est déjà enregistrée.');
								}
								else {
									
									that.saveData().then(function() {
										Container.get('websockets').emit('plugins.videos.video.added', stVideo);
									})
									.catch(function(err) {
										Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.video.add : ' + err);
										socket.emit('plugins.videos.error', err);
									});

								}
								
							}

						}
						catch (e) {
							Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.video.add : ' + ((e.message) ? e.message : e));
							Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
						}

					})
					.on('plugins.videos.video.edit', function (data) {

						if (Container.get('conf').get('debug')) {
							Container.get('logs').log('plugins.videos.video.edit');
						}

						try {

							if (!data || !data.video || !data.video.name || !data.video.url || !data.video.code) {
								socket.emit('plugins.videos.error', 'Des données sont manquantes.');
							}
							else {
								
								let bCategoryFound = false, stVideo = false;

									that.categories.forEach(function(category, catkey) {

										if (category.code === data.category.code) {

											bCategoryFound = true;

											category.videos.forEach(function(video, vidkey) {

												if (video.code === data.video.code) {
													stVideo = _formateVideo(data.video);
													that.categories[catkey].videos[vidkey] = stVideo;
												}

											});

										}

									});

								if (!bCategoryFound) {
									socket.emit('plugins.videos.error', 'Impossible de trouver cette catégorie.');
								}
								else if (!stVideo) {
									socket.emit('plugins.videos.error', 'Impossible de trouver cette vidéo.');
								}
								else {

									that.saveData().then(function() {
										Container.get('websockets').emit('plugins.videos.video.edited', stVideo);
									})
									.catch(function(err) {
										Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.video.edit : ' + err);
										socket.emit('plugins.videos.error', err);
									});

								}

							}

						}
						catch (e) {
							Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.video.edit : ' + ((e.message) ? e.message : e));
							Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
						}

					})
					.on('plugins.videos.video.delete', function (data) {

						if (Container.get('conf').get('debug')) {
							Container.get('logs').log('plugins.videos.video.delete');
						}

						let bCategoryFound = false, bVideoFound = false;

						try {

							that.categories.forEach(function(category, catkey) {

								if (category.code === data.category.code) {

									bCategoryFound = true;

									category.videos.forEach(function(video, vidkey) {

										if (video.code === data.video.code) {
											bVideoFound = true;
											that.categories[catkey].videos.splice(vidkey, 1);
										}

									});

								}

							});

							if (!bCategoryFound) {
								socket.emit('plugins.videos.error', 'Impossible de trouver cette catégorie.');
							}
							else if (!bVideoFound) {
								socket.emit('plugins.videos.error', 'Impossible de trouver cette vidéo.');
							}
							else {

								that.saveData().then(function() {
									that.loadVideosByCategory(Container, data.category);
								})
								.catch(function(err) {
									Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.video.delete : ' + err);
									socket.emit('plugins.videos.error', err);
								});

							}

						}
						catch (e) {
							Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.video.delete : ' + ((e.message) ? e.message : e));
							Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
						}

					});

					// action

						socket.on('plugins.videos.video.playsound', function (data) {

							if (Container.get('conf').get('debug')) {
								Container.get('logs').log('plugins.videos.video.playsound');
							}

							try {

								if (!data) {
									Container.get('logs').err('play video - données manquantes');
									socket.emit('plugins.videos.error', 'Données manquantes');
								}
								else if (!data.child) {
									Container.get('logs').err('play video - aucun enfant choisi');
									socket.emit('plugins.videos.error', 'Aucun enfant choisi');
								}
								else if (!data.video) {
									Container.get('logs').err('play video - aucune vidéo choisie');
									socket.emit('plugins.videos.error', 'Aucune vidéo choisie');
								}
								else {
									Container.get('childssockets').emitTo(data.child.token, 'media.sound.play', data.video);
								}

							}
							catch (e) {
								Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.video.playsound : ' + ((e.message) ? e.message : e));
								Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
							}

						});

						socket.on('plugins.videos.video.playvideo', function (data) {

							if (Container.get('conf').get('debug')) {
								Container.get('logs').log('plugins.videos.video.playvideo');
							}

							try {

								if (!data) {
									Container.get('logs').err('play video - données manquantes');
									socket.emit('plugins.videos.error', 'Données manquantes');
								}
								else if (!data.child) {
									Container.get('logs').err('play video - aucun enfant choisi');
									socket.emit('plugins.videos.error', 'Aucun enfant choisi');
								}
								else if (!data.video) {
									Container.get('logs').err('play video - aucune vidéo choisie');
									socket.emit('plugins.videos.error', 'Aucune vidéo choisie');
								}
								else {
									Container.get('childssockets').emitTo(data.child.token, 'media.video.play', data.video);
								}

							}
							catch (e) {
								Container.get('logs').err('-- [plugins/VideosManager] - plugins.videos.video.playvideo : ' + ((e.message) ? e.message : e));
								Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
							}

						});

			});

			resolve();
		
		});

	}

	unload (Container) {

		super.unload();

		let that = this;

		return new Promise(function(resolve, reject) {

			that.categories = null;
			Container.get('websockets').getSockets().forEach(_freeSocket);

			resolve();
		
		});

	}

	uninstall () {
		return fs.unlinkProm(this.backupFilePath);
	}

};
