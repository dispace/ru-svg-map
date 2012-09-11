SVG maps of Russia and the world
================================

**Draft**

This package contains JavaScript for generation of intercative SVG maps. Main features are:

* Generation of SVG according to given set of path coordinates
* Downgrading to VML for IE, common interface for styles manipulation in SVG and VML (setColor, setStroke, setOpacity)
* Support of map resizing (by buttons and by mouse wheel) and dragging
* Support of touch events: resize and drag gestures, element click emulation
* Included inner shadow style for elements
* Support of fitting to selected element
* Native browser events can be attached to SVG/VML nodes without any troubles

The package contains:

* vector.js: universal framework-independent core, providing basic SVG manipulation methods
* map-jquery.js and map-mootools.js: two example implementations of the map based to vector.js working with two popular frameworks. They can be hacked and customized.
* path packs for maps of Russia and the world. Paths are verified by %institutename% as corresponding official recognized by Russian Federation state borders
