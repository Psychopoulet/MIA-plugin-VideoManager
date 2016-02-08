
"use strict";

// deps

	const	path = require('path'),
			fs = require('fs'),
			simpleplugin = require('simpleplugin');

// private

	function _formateVideo(video) {

		video.url = video.url 	.replace('http:', 'https:')
								.replace('m.', '')
								.replace('//youtu', '//www.youtu')
								.replace('youtu.be/', 'youtube.com/watch?v=')
								.replace(/&(.*)/, '');

		video.urlembeded = video.url 	.replace('.com/', '.com/embed/')
										.replace('watch?v=', '');

		if (!video.code || '' == video.code) {

			if (1 < video.url.split('=').length) {
				video.code = video.url.split('=')[1];
			}
			else {
				video.code = video.name;
			}

		}

		return video;

	}

// module

module.exports = class MIAPluginVideosManager extends require('simpleplugin') {

	constructor () {

		super();

		this.directory = __dirname;
		this.loadDataFromPackageFile();

		this.categories = [];
		this.backupFilePath = path.join(__dirname, 'backup.json');

	}

	load () {

		var that = this;

		return new Promise(function(resolve, reject) {

			try {

				fs.readFile(that.backupFilePath, { encoding : 'utf8' } , function (err, data) {

					if (err) {
						reject('Impossible de lire les données enregistrée : ' + ((err.message) ? err.message : err) + '.');
					}
					else {

						try {
							that.categories = JSON.parse(data);
							resolve();
						}
						catch (e) {
							reject('Impossible de lire les données enregistrée : ' + ((err.message) ? err.message : err) + '.');
						}

					}

				});

			}
			catch(e) {
				reject((e.message) ? e.message : e);
			}

		});

	}

	save () {

		var that = this;

		return new Promise(function(resolve, reject) {

			try {

				fs.writeFile(that.backupFilePath, JSON.stringify(this.categories), { encoding : 'utf8' } , function (err, data) {

					if (err) {
						reject('Impossible de sauvegarder les données : ' + ((err.message) ? err.message : err) + '.');
					}
					else {
						resolve();
					}

				});

			}
			catch (e) {
				reject('Impossible de sauvegarder les données : ' + ((err.message) ? err.message : err) + '.');
			}

		});

	}

	loadCategories (Container) {

		var tabCategories = [];

		try {

			if (0 < this.categories.length) {

				this.categories.forEach(function(category) {

					tabCategories.push({
						code : category.code,
						name : category.name
					});

				});

				Container.get('websockets').emit('plugins.videos.categories', tabCategories);
				
			}
			else {

				this.load().then(function() {

					this.categories.forEach(function(category) {

						tabCategories.push({
							code : category.code,
							name : category.name
						});

					});

					Container.get('websockets').emit('plugins.videos.categories', tabCategories);

				});

			}

		}
		catch(e) {
			Container.get('logs').err('-- [plugins] : ' + ((e.message) ? e.message : e));
			Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
		}

	}

	loadVideosByCategory (Container, p_stCategory) {

		var tabVideos = [];

		try {

			this.categories.forEach(function(category) {

				if (category.code === p_stCategory.code) {
					tabVideos = category.videos;
				}

			});

			Container.get('websockets').emit('plugins.videos.videos', tabVideos);

		}
		catch(e) {
			Container.get('logs').err('-- [plugins] : ' + ((e.message) ? e.message : e));
			Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
		}

	}

	run (Container) {

		var that = this;

		Container.get('websockets').onDisconnect(function(socket) {

			// categories

				socket.removeAllListeners('plugins.videos.category.add');
				socket.removeAllListeners('plugins.videos.category.edit');
				socket.removeAllListeners('plugins.videos.category.delete');

			// videos

				socket.removeAllListeners('plugins.videos.videos');

				socket.removeAllListeners('plugins.videos.video.add');
				socket.removeAllListeners('plugins.videos.video.edit');
				socket.removeAllListeners('plugins.videos.video.delete');

				socket.removeAllListeners('plugins.videos.video.play');

		})
		.onLog(function(socket) {

			that.loadCategories(Container);

			// categories

				socket.on('plugins.videos.category.add', function (data) {

					if (Container.get('conf').get('debug')) {
						Container.get('logs').log('plugins.videos.category.add');
					}

					var bFound = false;

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

							that.save().then(function() {

								Container.get('websockets').emit('plugins.videos.category.added', {
									code : data.name,
									name : data.name
								});

							})
							.catch(function(err) {
								socket.emit('plugins.videos.error', err);
							});

						}

					}
					catch (e) {
						Container.get('logs').err('-- [plugins] : ' + ((e.message) ? e.message : e));
						Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
					}

				})
				.on('plugins.videos.category.edit', function (data) {

					if (Container.get('conf').get('debug')) {
						Container.get('logs').log('plugins.videos.category.edit');
					}

					var bFound = false;

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

							that.save().then(function() {

								Container.get('websockets').emit('plugins.videos.category.edited', {
									code : data.code,
									name : data.name
								});

							})
							.catch(function(err) {
								socket.emit('plugins.videos.error', err);
							});

						}

					}
					catch (e) {
						Container.get('logs').err('-- [plugins] : ' + ((e.message) ? e.message : e));
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

						that.save().then(function() { that.loadCategories(Container); })
						.catch(function(err) {
							socket.emit('plugins.videos.error', err);
						});

					}
					catch (e) {
						Container.get('logs').err('-- [plugins] : ' + ((e.message) ? e.message : e));
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

							var bCategoryFound = false, stVideo = false;

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
								
								that.save().then(function() {
									Container.get('websockets').emit('plugins.videos.video.added', stVideo);
								})
								.catch(function(err) {
									socket.emit('plugins.videos.error', err);
								});

							}
							
						}

					}
					catch (e) {
						Container.get('logs').err('-- [plugins] : ' + ((e.message) ? e.message : e));
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
							
							var bCategoryFound = false, stVideo = false;

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

								that.save().then(function() {
									Container.get('websockets').emit('plugins.videos.video.edited', stVideo);
								})
								.catch(function(err) {
									socket.emit('plugins.videos.error', err);
								});

							}

						}

					}
					catch (e) {
						Container.get('logs').err('-- [plugins] : ' + ((e.message) ? e.message : e));
						Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
					}

				})
				.on('plugins.videos.video.delete', function (data) {

					if (Container.get('conf').get('debug')) {
						Container.get('logs').log('plugins.videos.video.delete');
					}

					var bCategoryFound = false, bVideoFound = false;

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

							that.save().then(function() {
								that.loadVideosByCategory(Container, data.category);
							})
							.catch(function(err) {
								socket.emit('plugins.videos.error', err);
							});

						}

					}
					catch (e) {
						Container.get('logs').err('-- [plugins] : ' + ((e.message) ? e.message : e));
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
							Container.get('logs').err('-- [plugins] : ' + ((e.message) ? e.message : e));
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
							Container.get('logs').err('-- [plugins] : ' + ((e.message) ? e.message : e));
							Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
						}

					});

		});

	}

	free () {
		super.free();
	}

};
