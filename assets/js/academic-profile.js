/* Discourage casual saving of the portrait without changing browser navigation. */
(function () {
  'use strict';
  var portrait = document.querySelector('.profile-photo img');
  if (!portrait) return;
  ['contextmenu', 'dragstart'].forEach(function (eventName) {
    portrait.addEventListener(eventName, function (event) { event.preventDefault(); });
  });
}());
