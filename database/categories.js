
"use strict";

// private

	var _sSelectQuery = "SELECT id, name FROM plugin_videos_categories";

// module

module.exports = class DBPluginsVideosCategories {

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
						reject('La catégorie renseignée est incorrecte.');
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

		searchByUser(user) {
			
			let that = this;

			return new Promise(function(resolve, reject) {

				try {

					if (!user) {
						reject('Aucun utilisateur renseigné.');
					}
						else if (!user.id) {
							reject("L'utilisateur renseigné n'est pas valide.");
						}
					else {

						that.db.all(_sSelectQuery + " WHERE id_user = :id_user ORDER BY name ASC;", { ':id_user': user.id }, function(err, rows) {

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

		searchByUserByName(user, name) {
			
			let that = this;

			return new Promise(function(resolve, reject) {

				try {

					if (!user) {
						reject('Aucun utilisateur renseigné.');
					}
						else if (!user.id) {
							reject("L'utilisateur renseigné n'est pas valide.");
						}
					else if (!name) {
						reject('Aucun nom renseigné.');
					}
					else {

						that.db.all(_sSelectQuery + " WHERE id_user = :id_user AND name = :name;", { ':id_user': user.id, ':name': name }, function(err, rows) {

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

		add (category) {

			let that = this;

			return new Promise(function(resolve, reject) {

				try {

					if (!category) {
						reject('Aucune categorie renseignée.');
					}
					else if (!category.user) {
						reject('Aucun utilisateur renseigné.');
					}
						else if (!category.user.id) {
							reject("L'utilisateur renseigné n'est pas valide.");
						}
					else if (!category.name) {
						reject('Aucun nom renseigné.');
					}
					else {

						that.db.run("INSERT INTO plugin_videos_categories (id_user, name) VALUES (:id_user, :name);", {
							':id_user': category.user.id,
							':name': category.name
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

		edit (category) {

			let that = this;

			return new Promise(function(resolve, reject) {

				try {

					if (!category) {
						reject('Aucune categorie renseignée.');
					}
						else if (!category.id) {
							reject('La catégorie renseignée est incorrecte.');
						}
					else if (!category.name) {
						reject('Aucun nom renseigné.');
					}
					else {

						that.db.run("UPDATE plugin_videos_categories SET name = :name WHERE id = :id;", {
							':id': category.id,
							':name': category.name
						}, function(err) {

							if (err) {
								reject((err.message) ? err.message : err);
							}
							else {
								resolve(category);
							}

						});

					}

				}
				catch(e) {
					reject((e.message) ? e.message : e);
				}

			});

		}

		delete (category) {
			
			let that = this;

			return new Promise(function(resolve, reject) {

				if (!category) {
					reject('Aucune catégorie renseignée.');
				}
				else if (!category.id) {
					reject("La catégorie renseignée est invalide.");
				}
				else {

					that.db.run("DELETE FROM plugin_videos_categories WHERE id = :id;", { ':id' : category.id }, function(err) {

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
