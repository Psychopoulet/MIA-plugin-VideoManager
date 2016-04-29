
"use strict";

// private

	var _sSelectQuery = "SELECT id, name, url, urlembeded FROM plugin_videos_videos";

// module

module.exports = class DBPluginsVideosVideos {

	constructor (db) {
		this.db = db;
	}

	// read

		lastInserted() {

			let that = this;

			return new Promise(function(resolve, reject) {

				try {

					that.db.get(_sSelectQuery + " ORDER BY id DESC LIMIT 0,1;", [], function(err, row) {
						
						if (err) {
							reject((err.message) ? err.message : err);
						}
						else {
							resolve((row) ? row : {});
						}

					});

				}
				catch(e) {
					reject((e.message) ? e.message : e);
				}

			});

		}

		searchById(id) {
			
			let that = this;

			return new Promise(function(resolve, reject) {

				try {

					if (!id) {
						reject('La vidéo renseignée est incorrecte.');
					}
					else {

						that.db.all(_sSelectQuery + " WHERE id = :id ORDER BY name ASC;", { ':id': id }, function(err, rows) {

							if (err) {
								reject((err.message) ? err.message : err);
							}
							else if (!rows || 0 >= rows.length) {
								resolve(null);
							}
							else {
								resolve(rows[0]);
							}

						});

					}

				}
				catch(e) {
					reject((e.message) ? e.message : e);
				}

			});

		}

		searchByCategory(category) {
			
			let that = this;

			return new Promise(function(resolve, reject) {

				try {

					if (!category) {
						reject('Aucune categorie renseignée.');
					}
						else if (!category.id) {
							reject("La categorie renseignée n'est pas valide.");
						}
					else {

						that.db.all(_sSelectQuery + " WHERE id_category = :id_category ORDER BY name ASC;", { ':id_category': category.id }, function(err, rows) {

							if (err) {
								reject((err.message) ? err.message : err);
							}
							else if (!rows || 0 >= rows.length) {
								resolve([]);
							}
							else {
								resolve(rows);
							}

						});

					}

				}
				catch(e) {
					reject((e.message) ? e.message : e);
				}

			});

		}

		searchByCategoryByName(category, name) {
			
			let that = this;

			return new Promise(function(resolve, reject) {

				try {

					if (!category) {
						reject('Aucune categorie renseignée.');
					}
						else if (!category.id) {
							reject("La categorie renseignée n'est pas valide.");
						}
					else if (!name) {
						reject('Aucun nom renseigné.');
					}
					else {

						that.db.all(_sSelectQuery + " WHERE id_category = :id_category AND name = :name;", { ':id_category': category.id, ':name': name }, function(err, rows) {

							if (err) {
								reject((err.message) ? err.message : err);
							}
							else if (!rows || 0 >= rows.length) {
								resolve(null);
							}
							else {
								resolve(rows[0]);
							}

						});

					}

				}
				catch(e) {
					reject((e.message) ? e.message : e);
				}

			});

		}

	// write

		add (video) {

			let that = this;

			return new Promise(function(resolve, reject) {

				try {

					if (!video) {
						reject('Aucune vidéo renseignée.');
					}
					else if (!video.category) {
						reject('Aucune catégorie renseignée.');
					}
						else if (!video.category.id) {
							reject("La catégorie renseignée n'est pas valide.");
						}
					else if (!video.name) {
						reject('Aucun nom renseigné.');
					}
					else if (!video.url) {
						reject('Aucune url renseignée.');
					}
					else if (!video.urlembeded) {
						reject('Aucune url embarquée renseignée.');
					}
					else {

						that.db.run("INSERT INTO plugin_videos_videos (id_category, name, url, urlembeded) VALUES (:id_category, :name, :url, :urlembeded);", {
							':id_category': video.category.id,
							':name': video.name,
							':url': video.url,
							':urlembeded': video.urlembeded
						}, function(err) {

							if (err) {
								reject((err.message) ? err.message : err);
							}
							else {
								that.lastInserted().then(resolve).catch(reject);
							}

						});

					}

				}
				catch(e) {
					reject((e.message) ? e.message : e);
				}

			});

		}

		edit (video) {

			let that = this;

			return new Promise(function(resolve, reject) {

				try {

					if (!video) {
						reject('Aucune vidéo renseignée.');
					}
					else if (!video.category) {
						reject('Aucune catégorie renseignée.');
					}
						else if (!video.category.id) {
							reject("La catégorie renseignée n'est pas valide.");
						}
					else if (!video.name) {
						reject('Aucun nom renseigné.');
					}
					else if (!video.url) {
						reject('Aucune url renseignée.');
					}
					else if (!video.urlembeded) {
						reject('Aucune url embarquée renseignée.');
					}
					else {

						that.db.run("UPDATE plugin_videos_videos SET name = :name, url = :url, urlembeded = :urlembeded WHERE id = :id;", {
							':id': video.id,
							':name': video.name,
							':url': video.url,
							':urlembeded': video.urlembeded
						}, function(err) {

							if (err) {
								reject((err.message) ? err.message : err);
							}
							else {
								resolve(video);
							}

						});

					}

				}
				catch(e) {
					reject((e.message) ? e.message : e);
				}

			});

		}

		delete (video) {
			
			let that = this;

			return new Promise(function(resolve, reject) {

				if (!video) {
					reject('Aucune vidéo renseignée.');
				}
				else if (!video.id) {
					reject("La vidéo renseignée est invalide.");
				}
				else {

					that.db.run("DELETE FROM plugin_videos_videos WHERE id = :id;", { ':id' : video.id }, function(err) {

						if (err) {
							reject((err.message) ? err.message : err);
						}
						else {
							resolve();
						}

					});

				}

			});

		}

};
