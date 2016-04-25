
"use strict";

// deps

	const	path = require('path'),
			fs = require('simplefs'),

			Categories = require(path.join(__dirname, 'database', 'categories.js')),
			Videos = require(path.join(__dirname, 'database', 'videos.js'));

// private

	function _runSQLFile(Container, SQLFile) {

		return new Promise(function(resolve, reject) {

			fs.readFileProm(SQLFile, 'utf8').then(function(sql) {

				let queries = [];

				sql.split(';').forEach(function(query) {

					query = query.trim()
								.replace(/--(.*)\s/g, "")
								.replace(/\s/g, " ")
								.replace(/  /g, " ");

					if ('' != query) {
						queries.push(query + ';');
					}

				});

				function executeQueries(i) {

					if (i >= queries.length) {
						resolve();
					}
					else {

						Container.get('db').run(queries[i], [], function(err) {

							if (err) {
								reject((err.message) ? err.message : err);
							}
							else {
								executeQueries(i + 1);
							}

						});

					}

				}

				executeQueries(0);

			}).catch(reject);

		});

	}

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

module.exports = class MIAPluginVideosManager extends require('simplepluginsmanager').SimplePlugin {

	constructor () {
 
		super();
 
		this.categories = null;
		this.videos = null;

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

	loadCategoriesByUser (Container, user) {

		try {

			Container.get('db').all("SELECT * FROM plugin_videos_categories WHERE id_user = :id_user;", { ':id_user', user.id }, function(err, rows) {

				if (err) {
					Container.get('logs').err('-- [plugins/VideosManager] - loadCategoriesByUser : ' + ((err.message) ? err.message : err));
					socket.emit('plugins.videos.error', (err.message) ? err.message : err);
				}
				else {

					let categories = [];

					if (rows) {

						rows.forEach(function(category) {

							categories.push({
								code : category.code,
								name : category.name
							});

						});

					}

					Container.get('websockets').emit('plugins.videos.categories', categories);

				}

			});

		}
		catch(e) {
			Container.get('logs').err('-- [plugins/VideosManager/] - loadCategoriesByUser : ' + ((e.message) ? e.message : e));
			Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
		}

	}

	loadVideosByCategory (Container, category) {

		let tabVideos = [];

		try {

			Container.get('db').all("SELECT * FROM plugin_videos_videos WHERE id_category = :id_category;", { ':id_category', category.id }, function(err, rows) {

				if (err) {
					Container.get('logs').err('-- [plugins/VideosManager] - loadVideosByCategory : ' + ((err.message) ? err.message : err));
					socket.emit('plugins.videos.error', (err.message) ? err.message : err);
				}
				else {

					let videos = [];

					if (rows) {

						rows.forEach(function(video) {

							videos.push({
								urls : {
									normal: video.url
									embeded: video.urlembeded
								},
								code : video.code,
								name : video.name
							});

						});

					}

					Container.get('websockets').emit('plugins.videos.videos', videos);

				}

			});

		}
		catch(e) {
			Container.get('logs').err('-- [plugins/VideosManager] - loadVideosByCategory : ' + ((e.message) ? e.message : e));
			Container.get('websockets').emit('plugins.videos.error', ((e.message) ? e.message : e));
		}

	}

	load (Container) {

		let that = this;

		return new Promise(function(resolve, reject) {

			Container.get('users').lastInserted().then(function(user) {

				that.categories = new Categories(Container.get('db'));
				that.videos = new Videos(Container.get('db'));

				Container.get('websockets').onDisconnect(_freeSocket).onLog(function(socket) {

					that.loadCategoriesByUser(Container, user);

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

								that.saveData().then(function() { that.loadCategories(Container, user); })
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

						socket.on('plugins.videos.videos', function(p_stCategory) {
							that.loadVideosByCategory(Container, p_stCategory);
						})

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
		
			}).catch(reject);

		});

	}

	unload (Container) {

		super.unload();

		let that = this;

		return new Promise(function(resolve, reject) {

			that.categories = null;
			that.videos = null;

			Container.get('websockets').getSockets().forEach(_freeSocket);

			resolve();
		
		});

	}

	install (Container) {
		return _runSQLFile(Container, path.join(__dirname, 'database', 'create.sql'));
	}

	uninstall () {
		return _runSQLFile(Container, path.join(__dirname, 'database', 'delete.sql'));
	}

};
