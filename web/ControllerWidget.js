app.controller('ControllerVideosManager',
	['$scope', '$popup', '$actions',
	function($scope, $popup, $actions) {

	"use strict";

	// attributes

		// private

			var clModalForm = jQuery('#modalFormVideo');
			var tabActionsTypes = [];

		// public

			$scope.categories = [];
			$scope.selectedcategory = null;

			$scope.videos = [];
			$scope.selectedvideo = null;

			$scope.childs = [];
			$scope.selectedchild = null;

	// methods

		// public

			$scope.selectCategory = function (category) {

				if (category) {
					$scope.selectedcategory = category;
					socket.emit('plugins.videos.videos', category);
				}
				else {
					$scope.selectedcategory = null;
					$scope.videos = [];
				}

			};

			// models

				// categories

				$scope.addCategory = function () {

					$popup.prompt({
						title: 'Nouvelle catégorie',
						onconfirm: function(name) {
							socket.emit('plugins.videos.category.add', { name : name });
						}
					});

				};
				$scope.editCategory = function (category) {

					$popup.prompt({
						title: 'Modifier catégorie',
						val: category.name,
						onconfirm: function(name) {
							category.name = name;
							socket.emit('plugins.videos.category.edit', category);
						}
					});

				};
				$scope.deleteCategory = function (category) {

					$popup.confirm({
						title: 'Supprimer catégorie',
						message: 'Voulez-vous vraiment supprimer "' + category.name + '" ?',
						val: category.name,
						onconfirm: function() {
							socket.emit('plugins.videos.category.delete', category);
						}
					});

				};

				// videos

				$scope.openWindowVideo = function(category, video) {
					$scope.formvideo = (video) ? angular.copy(video) : {};
					clModalForm.modal('show');
				};

				$scope.writeVideo = function (category, video) {

					if (!video.name) {
						$popup.alert("La vidéo n'a pas de nom.");
					}
					else if (!video.url) {
						$popup.alert("La vidéo n'a pas d'url.");
					}
					else if (!video.code) {
						socket.emit('plugins.videos.video.add', { category : category, video : video });
					}
					else {
						socket.emit('plugins.videos.video.edit', { category : category, video : video });
					}

				};
				$scope.deleteVideo = function (category, video) {

					$popup.confirm({
						title: 'Supprimer vidéo',
						message: 'Voulez-vous vraiment supprimer "' + video.name + '" ?',
						val: category.name,
						onconfirm: function() {
							socket.emit('plugins.videos.video.delete', { category : category, video : video });
						}
					});

				};

			// interface

				$scope.closeModalFormVideo = function () {
					clModalForm.modal('hide');
				};

				// play

					$scope.preview = function (video) {
						$popup.iframe(video.urlembeded + '?autoplay=1');
					};

					$scope.playSound = function (child, video) {

						socket.emit('plugins.videos.video.playsound', {
							child : child, video : video
						});

					};

					$scope.playVideo = function (child, video) {

						socket.emit('plugins.videos.video.playvideo', {
							child : child, video : video
						});

					};

				// actions

					$scope.createSoundAction = function (child, video) {

						for (var i = 0; i < tabActionsTypes.length; ++i) {

							if (tabActionsTypes[i].command == 'media.sound.play') {
								$actions.add(video.name, child, tabActionsTypes[i], video);
								break;
							}

						}

					};

					$scope.createVideoAction = function (child, video) {

						for (var i = 0; i < tabActionsTypes.length; ++i) {

							if (tabActionsTypes[i].command == 'media.video.play') {
								$actions.add(video.name, child, tabActionsTypes[i], video);
								break;
							}

						}

					};

	// constructor

		// events

			// actionstypes

			socket.on('actionstypes', function(actionstypes) {
				tabActionsTypes = actionstypes;
				$scope.$apply();
			})

			// childs

			.on('childs', function (childs) {

				$scope.childs = [];
				angular.forEach(childs, function(child) {

					if (child.connected && 'ACCEPTED' == child.status.code) {
						$scope.childs.push(child);
					}

				});
				
				$scope.selectedchild = (1 == $scope.childs.length) ? $scope.childs[0] : null;
				$scope.$apply();

			})
			.on('plugins.videos.error', function(err) {

				$popup.alert({
					message: err,
					type: 'danger'
				});

			})

			// categories

			.on('plugins.videos.categories', function (categories) {
				$scope.categories = categories;
				$scope.selectCategory((1 == $scope.categories.length) ? $scope.categories[0] : null);
				$scope.$apply();
			})

			.on('plugins.videos.category.added', function (category) {

				$scope.categories.push(category);
				$scope.selectCategory(category);

				$scope.$apply();

			})
			.on('plugins.videos.category.edited', function (category) {

				for (var i = 0; i < $scope.categories.length; ++i) {

					if (category.code == $scope.categories[i].code) {
						$scope.categories[i] = category;
						$scope.selectCategory(category);
						break;
					}

				}
				
				$scope.$apply();

			});

			// videos

			socket.on('plugins.videos.videos', function (videos) {

				$scope.videos = videos;
				$scope.selectedvideo = (1 == $scope.videos.length) ? $scope.videos[0] : null;
				
				$scope.$apply();

			})

			.on('plugins.videos.video.added', function (video) {
				
				$scope.videos.push(video);
				$scope.selectedvideo = video;

				$scope.closeModalFormVideo();
				$scope.$apply();

			})
			.on('plugins.videos.video.edited', function (video) {

				for (var i = 0; i < $scope.videos.length; ++i) {

					if (video.code == $scope.videos[i].code) {
						$scope.videos[i] = video;
						$scope.selectedvideo = video;
						break;
					}

				}
				
				$scope.closeModalFormVideo();
				$scope.$apply();

			});

		// interface

			clModalForm.modal({
				backdrop : 'static',
				keyboard: false,
				show : false
			})
			.on('shown.bs.modal', function () {
				jQuery(clModalForm.find('input')[0]).focus();
			});
		
}]);
