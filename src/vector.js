/*!
 *
 * Core framework-independent engine to manipulate with SVG maps.
 * Supports touch devices, scaling, dragging, inner shadows, VML in case of IE,
 * etc.
 *
 * Copyright 2012, SmartTeleMax team.
 * Licensed under the MIT license.
 *
 *
 * Based on jVectorMap version 0.1a
 *
 * Copyright 2011, Kirill Lebedev
 * Licensed under the MIT license.
 *
 */
(function(){

    var apiParams = {
        colors: 1,
        values: 1,
        backgroundColor: 1,
        scaleColors: 1,
        normalizeFunction: 1
    };

    var defaultParams = {
        backgroundColor: '#505050',
        color: '#ffffff',
        hoverColor: 'black',
        scaleColors: ['#b6d6ff', '#005ace'],
        normalizeFunction: 'linear'
    };

    /*
     * ================================== Helpers =======================
     */
    function extend(obj){
        for(var i=1; i<arguments.length; i++){
            for (key in arguments[i]){
                obj[key] = arguments[i][key];
            }
        }
        return obj;
    }
    function addEvent(elem, type, fn){
      if (elem.addEventListener) {
        elem.addEventListener(type, fn, false);
      } else if (elem.attachEvent) {
        elem.attachEvent("on" + type, fn);
      }
    }
    function preventDefault(e){
      if (e.preventDefault) { e.preventDefault(); }
      else { e.returnValue = false; }
    }
    function stopEvent(e){
      if (e.stopPropagation) { e.stopPropagation(); } 
      else { e.cancelBubble = true; } 
    }
    function pageXY(e){
      if (e.pageX || e.pageY) {
        return {'pageX': e.pageX,
                'pageY': e.pageY};
      } else {
        return {'pageX': e.clientX + document.body.scrollLeft
                          + document.documentElement.scrollLeft,
                'pageY': e.clientY + document.body.scrollTop
                          + document.documentElement.scrollTop};
      }
    }

    /*
     * ================================== vectorMap =====================
     */

    window.vectorMap = function(elem, options) {

        var params = extend({}, defaultParams, options);

        params.container = elem;
        return new WorldMap(params);
    };

    /*
     * ================================== VectorCanvas ==================
     */

    var VectorCanvas = function(width, height) {
        this.mode = window.SVGAngle ? 'svg' : 'vml';
        if (this.mode == 'svg') {
            this.createSvgNode = function(nodeName) {
                return document.createElementNS(this.svgns, nodeName);
            }
        } else {
            try {
                if (!document.namespaces.rvml) {
                    document.namespaces.add("rvml","urn:schemas-microsoft-com:vml");
                }
                this.createVmlNode = function (tagName) {
                    return document.createElement('<rvml:' + tagName + ' class="rvml">');
                };
            } catch (e) {
                this.createVmlNode = function (tagName) {
                    return document.createElement('<' + tagName + ' xmlns="urn:schemas-microsoft.com:vml" class="rvml">');
                };
            }
            document.createStyleSheet().addRule(".rvml", "behavior:url(#default#VML)");
        }
        if (this.mode == 'svg') {
            this.canvas = this.createSvgNode('svg');
        } else {
            this.canvas = this.createVmlNode('group');
            this.canvas.style.position = 'absolute';
        }
        this.setSize(width, height);
    }

    VectorCanvas.prototype = {
        svgns: "http://www.w3.org/2000/svg",
        mode: 'svg',
        width: 0,
        height: 0,
        canvas: null,

        setSize: function(width, height) {
            if (this.mode == 'svg') {
                this.canvas.setAttribute('width', width);
                this.canvas.setAttribute('height', height);
            } else {
                this.canvas.style.width = width + "px";
                this.canvas.style.height = height + "px";
                this.canvas.coordsize = width+' '+height;
                this.canvas.coordorigin = "0 0";

                if (this.rootGroup) {
                    var pathes = this.rootGroup.getElementsByTagName('shape');
                    for(var i=0, l=pathes.length; i<l; i++) {
                        pathes[i].coordsize = width+' '+height;
                        pathes[i].style.width = width+'px';
                        pathes[i].style.height = height+'px';
                    }
                    this.rootGroup.coordsize = width+' '+height;
                    this.rootGroup.style.width = width+'px';
                    this.rootGroup.style.height = height+'px';
                }
            }
            this.width = width;
            this.height = height;
        },

        createPath: function(config) {
            var node;
            if (this.mode == 'svg') {
                node = this.createSvgNode('path');
                node.setAttribute('d', config.path);
                node.setFill = function(color) {
                    this.setAttribute("fill", color);
                    return this;
                };
                node.setStroke = function(color, width) {
                    if (color != null) this.setAttribute("stroke", color);
                    if (width != null) this.setAttribute("stroke-width", width);
                    return this;
                };
                node.getFill = function(color) {
                    return this.style.getProperty("fill");
                };
                node.setOpacity = function(opacity) {
                    this.setAttribute('fill-opacity', opacity);
                    return this;
                };
            } else {
                node = this.createVmlNode('shape');
                node.coordorigin = "0 0";
                node.coordsize = this.width + ' ' + this.height;
                node.style.width = this.width+'px';
                node.style.height = this.height+'px';
                node.fillcolor = '#ddd';
                node.stroked = true;
                node.path = this.pathSvgToVml(config.path);
                var scale = this.createVmlNode('skew');
                scale.on = true;
                scale.matrix = '0.01,0,0,0.01,0,0';
                scale.offset = '0,0';
                node.appendChild(scale);
                var stroke = this.createVmlNode('stroke');
                stroke.weight = 0;
                node.appendChild(stroke);
                var fill = this.createVmlNode('fill');
                fill.chromakey = '#FFF';
                node.appendChild(fill);
                node.setStroke = function(color, width) {
                    var el = this.getElementsByTagName('stroke')[0];
                    if (color != null) el.color = color;
                    if (width != null) el.weight = width/3;
                    return this;
                };
                node.setFill = function(color) {
                    this.getElementsByTagName('fill')[0].color = color;
                    return this;
                };
                node.getFill = function(color) {
                    return this.getElementsByTagName('fill')[0].color;
                };
                node.setOpacity = function(opacity) {
                    this.getElementsByTagName('fill')[0].opacity = parseInt(opacity*100)+'%';
                    return this;
                };
            }
            return node;
        },

        createGroup: function(isRoot) {
            var node;
            if (this.mode == 'svg') {
                node = this.createSvgNode('g');
            } else {
                node = this.createVmlNode('group');
                node.style.width = this.width+'px';
                node.style.height = this.height+'px';
                node.style.left = '0px';
                node.style.top = '0px';
                node.coordorigin = "0 0";
                node.coordsize = this.width + ' ' + this.height;
            }
            if (isRoot) {
                this.rootGroup = node;
            }
            return node;
        },

        applyTransformParams: function(scale, transX, transY) {
            if (this.mode == 'svg') {
                this.rootGroup.setAttribute('transform', 'scale('+scale+') translate('+transX+', '+transY+')');
            } else {
                this.rootGroup.coordorigin = (this.width-transX)+','+(this.height-transY);
                this.rootGroup.coordsize = this.width/scale+','+this.height/scale;
            }
        },

        pathSvgToVml: function(path) {
          path = path.split(' ');
          var last_command, cx=0, cy=0;
          var bad_commands = 'mclvh';
          var result = [];
          var j=0, i=0, coords = []
          var commands = 'MCLHVmclhvz';
          var first_coord = null;

          function put_point(letter, cx, cy){
            if (first_coord === null){
              first_coord = {x: cx, y: cy};
            }
            result.push(letter+ cx + ',' + cy);
          }


          //window.coord = []
          //window.comm = []
          while (i < path.length){
              if (path[i] == 'z' && first_coord){
                  put_point('l', first_coord.x, first_coord.y);
                  first_coord = null;
              } else if (path[i].length == 1 && commands.indexOf(path[i]) != -1){
                  last_command = path[i];
                  //window.comm.push(path[i]);
                  i++;
              } else {
                  function get_coord(){
                      var coord;
                      if (j < coords.length){
                          coord = coords[j];
                          j += 1;
                      } else {
                          coords = path[i].split(',');
                          coord = coords[0];
                          i += 1;
                          j = 1;
                      }
                      //window.coord.push(coord);
                      return Math.round(100*parseFloat(coord));
                  }
                  switch (last_command) {
                      case 'm':
                          cx += get_coord();
                          cy += get_coord();
                          put_point('m', cx, cy);
                          last_command = 'l';
                      break;
                      case 'M':
                          cx = get_coord();
                          cy = get_coord();
                          put_point('m', cx, cy);
                          last_command = 'L';
                      break;
                      case 'l':
                          cx += get_coord();
                          cy += get_coord();
                          put_point('l', cx, cy);
                      break;
                      case 'L':
                          cx = get_coord();
                          cy = get_coord();
                          put_point('l', cx, cy);
                      break;
                      case 'h':
                          cx += get_coord();
                          put_point('l', cx, cy);
                      break;
                      case 'H':
                          cx = get_coord();
                          put_point('l', cx, cy);
                      break;
                      case 'v':
                          cy += get_coord();
                          put_point('l', cx, cy);
                      break;
                      case 'V':
                          cy = get_coord();
                          put_point('l', cx, cy);
                      break;
                      case 'c':
                          get_coord();get_coord();
                          get_coord();get_coord();
                          cx += get_coord();
                          cy += get_coord();

                          put_point('l', cx, cy);
                      break;
                      case 'C':
                          get_coord();get_coord();
                          get_coord();get_coord();
                          cx = get_coord();
                          cy = get_coord();

                          put_point('l', cx, cy);
                      break;
                  }
              }
          }
          return result.join(' ');
        }
    }

    /*
     * ================================== WorldMap ==================
     */

    var WorldMap = function(params) {
        params = params || {};
        var map = this;

        this.container = params.container;

        // inner height and width ov svg drawing
        // like <svg height="" width="">
        this.defaultWidth = params.svg_width;
        this.defaultHeight = params.svg_height;

        if('maxScale' in params) this.maxScale = params.maxScale;
        if('minScale' in params) this.minScale = params.minScale;
        this.doubletouchEnabled = params.doubletouchEnabled || false;

        this.color = params.color;
        this.stroke = params.stroke;
        this.label_locked = false;

        this.width = this.containerWidth();
        this.height = this.containerHeight();

        this.resize();

        this.do_resize = function(){
            map.width = params.container.width();
            map.height = params.container.height();
            map.resize();
            map.canvas.setSize(map.width, map.height);
            map.applyTransform();
        }

        this.canvas = new VectorCanvas(this.width, this.height);
        params.container.appendChild(this.canvas.canvas);

        this.rootGroup = this.canvas.createGroup(true);

        this.index = WorldMap.mapIndex;


        for(var key in params.paths) {
            var path = this.canvas.createPath({path: params.paths[key]});
            path.setFill(this.color);
            if (this.stroke){
                path.setStroke(this.stroke[0], this.stroke[1]); // XXX added
            }

            if ('opacity' in params){
              path.setOpacity(params.opacity);
            }
            path.id = 'vectormap'+map.index+'_'+key;
            map.countries[key] = path;
            this.rootGroup.appendChild(path);
        }



        this.setColors(params.colors);

        this.canvas.canvas.appendChild(this.rootGroup);

        this.applyTransform();

        // Important! Attaching transform event only after
        // initial applyTransform
        if('onTransform' in params) this.onTransform = params.onTransform;

        this.colorScale = new ColorScale(params.scaleColors, params.normalizeFunction, params.valueMin, params.valueMax);
        if (params.values) {
            this.values = params.values;
            this.setValues(params.values);
        }

        WorldMap.mapIndex++;
    }

    window.WorldMap = WorldMap;

    WorldMap.prototype = {
        transX: 0,
        transY: 0,
        scale: 1,
        baseTransX: 0,
        baseTransY: 0,
        baseScale: 1,
        maxScale: 1000,
        minScale: null, // null means baseScale
        doubletouchEnabled: false,

        width: 0,
        height: 0,
        countries: {},
        countriesColors: {},
        countriesData: {},
        zoomStep: 1.4,
        zoomMaxStep: 4,
        zoomCurStep: 1,
        hasTouch: ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch, // from modernizr

        onTransform: function(){},


        setColors: function(key, color) {
            if (typeof key == 'string') {
                this.countries[key].setFill(color);
            } else {
                var colors = key;
                for (var code in colors) {
                    if (this.countries[code]) {
                        this.countries[code].setFill(colors[code]);
                    }
                }
            }
        },

        setValues: function(values) {
            var max = 0,
                min = Number.MAX_VALUE,
                val;

            for (var cc in values) {
                val = parseFloat(values[cc]);
                if (val > max) max = values[cc];
                if (val && val < min) min = val;
            }
            this.colorScale.setMin(min);
            this.colorScale.setMax(max);

            var colors = {};
            for (cc in values) {
                val = parseFloat(values[cc]);
                if (val) {
                    colors[cc] = this.colorScale.getColor(val);
                } else {
                    colors[cc] = this.color;
                }
            }
            this.setColors(colors);
            this.values = values;
        },

        setScaleColors: function(colors) {
            this.colorScale.setColors(colors);
            if (this.values) {
                this.setValues(this.values);
            }
        },

        setNormalizeFunction: function(f) {
            this.colorScale.setNormalizeFunction(f);
            if (this.values) {
                this.setValues(this.values);
            }
        },

        resize: function() {
            var curBaseScale = this.baseScale;
            if (this.width / this.height > this.defaultWidth / this.defaultHeight) {
                this.baseScale = this.height / this.defaultHeight;
                this.baseTransX = Math.abs(this.width - this.defaultWidth * this.baseScale) / (2 * this.baseScale);
            } else {
                this.baseScale = this.width / this.defaultWidth;
                this.baseTransY = Math.abs(this.height - this.defaultHeight * this.baseScale) / (2 * this.baseScale);
            }
            this.scale *= this.baseScale / curBaseScale;
            this.transX *= this.baseScale / curBaseScale;
            this.transY *= this.baseScale / curBaseScale;
        },

        applyTransform: function(transX, transY) {
          if (transX !== undefined){
            this.transX = transX;
          }
          if (transY !== undefined){
            this.transY = transY;
          }


          this.transX = Math.max(this.transX,
                                 this.width/this.scale - this.defaultWidth);
          this.transX = Math.min(this.transX, 0);

          this.transY = Math.max(this.transY,
                                this.height/this.scale - this.defaultHeight);
          this.transY = Math.min(this.transY, 0);

          this.canvas.applyTransformParams(this.scale, this.transX, this.transY);

          this.onTransform();
        },

        fitToPath: function(path){
          var bbox = path.getBBox();

          var scale = Math.min(this.width / (bbox.width * 1.2),
                               this.height / (bbox.height * 1.2))
          this.scale = this.correctScale(scale);

          this.transX = -bbox.x + (this.width / this.scale - bbox.width) / 2;
          this.transY = -bbox.y  + (this.height / this.scale - bbox.height) / 2;

          this.applyTransform();

        },

        setScale: function(scale) {
            this.scale = this.correctScale(scale);
            this.applyTransform();
        },

        getPath: function(cc) {
            return document.getElementById('vectormap'+this.index+'_'+cc);
        },

        getMaxScale: function(){
          var maxScale = this.maxScale;
          if (typeof maxScale == 'string' && maxScale.charAt(0) == 'x'){
            maxScale = this.baseScale * maxScale.substr(1);
          }
          return maxScale;
        },

        getMinScale: function(){
          var minScale = this.minScale!==null? this.minScale: this.baseScale;

          if (typeof minScale == 'string' && minScale.charAt(0) == 'x'){
            minScale = this.baseScale * minScale.substr(1);
          }
          return minScale;
        },

        correctScale: function(scale){
          return Math.min(Math.max(scale, this.getMinScale()), this.getMaxScale());
        },

        makeDraggable: function(){
          if (this.draggable) return;
          this.draggable = true;

          if (this.hasTouch){
            this.makeDraggableByTouch();
          } else {
            this.makeDraggableByMouse();
          }
        },

        makeDraggableByMouse: function(){
          /*
           * Draggable
           */

          var dragCoord, mouseIsDown=false, map=this;
          map.dragged = false;

          addEvent(document, 'mousemove', function(e){
            if (mouseIsDown){
              var x = map.transX + (e.clientX - dragCoord.x)/map.scale;
              var y = map.transY + (e.clientY - dragCoord.y)/map.scale;

              map.applyTransform(x, y);
              dragCoord = {x:e.clientX, y: e.clientY};
              map.dragged = true;
            }
          });
          addEvent(document, 'mouseup', function(){
            mouseIsDown = false;
          });

          addEvent(this.container, 'mousedown', function(e){
            mouseIsDown = true;
            map.dragged = false;
            dragCoord = {x:e.clientX, y: e.clientY};
          });

          /*
           * Scalable
           */

          addEvent(this.container, 'DOMMouseScroll', onScroll);
          addEvent(this.container, 'mousewheel', onScroll);

          function onScroll(e){
            preventDefault(e); stopEvent(e);
            var wheel = e.wheelDelta || -e.detail;

            var scale = map.scale;
            if (wheel < 0) { // XXX is this cross-browser?!
              scale *= 0.9
            } else if (wheel > 0) {
              scale /= 0.9;
            }
            scale = map.correctScale(scale);

            var scaleTranslateCoeff = 1/map.scale - 1/scale;

            var c = pageXY(e);

            var containerCoords = map.containerPosition();
            map.transX -= scaleTranslateCoeff * (c.pageX - containerCoords.x);
            map.transY -= scaleTranslateCoeff * (c.pageY - containerCoords.y);
            map.scale = scale;
            map.applyTransform();
          }
        },

        makeDraggableByTouch: function(){
          var touchlength = null, touchpos = null, touchmove=null, map=this;
          map.dragged = false;

          addEvent(this.container, 'touchmove', function(e){
              map.dragged = true;
              if (map.doubletouchEnabled && e.touches && e.touches.length == 2){
                preventDefault(e); stopEvent(e);
                var tch1 = e.touches.item(0);
                var tch2 = e.touches.item(1);
                var l = Math.sqrt(Math.pow(tch1.clientX - tch2.clientX, 2) + // test clientX in IE
                                  Math.pow(tch1.clientY - tch2.clientY, 2));
                var containerCoords = map.containerPosition();
                var p = {x: (tch1.pageX + tch2.pageX)/2 - containerCoords.x,
                         y: (tch1.pageY + tch2.pageY)/2 - containerCoords.y}
                if(touchlength){
                  var scaleTranslateCoeff = map.scale * (1-touchlength/l);

                  var scale = map.scale * l / touchlength;
                  scale = map.correctScale(scale);

                  var scaleTranslateCoeff = 0.5 * (1/map.scale - 1/scale);
                  var dx = p.x * scaleTranslateCoeff;
                  var dy = p.y * scaleTranslateCoeff;

                  map.transX += (p.x - touchpos.x -dx) / scale;
                  map.transY += (p.y - touchpos.y -dy) / scale;
                  map.scale = scale;
                  map.applyTransform();
                }
                touchlength = l;
                touchpos = p;
              } else if (e.touches && e.touches.length == 1){
                if(map.scale > map.baseScale) {
                  // don't prevent default action if there is max scale
                  preventDefault(e); stopEvent(e);
                  touchlength = touchpos = null;
                  var tch = {x: e.touches.item(0).clientX,
                             y: e.touches.item(0).clientY};
                  if(touchmove){
                    map.transX += (tch.x - touchmove.x) / map.scale;
                    map.transY += (tch.y - touchmove.y) / map.scale;
                    map.applyTransform();
                  }
                  touchmove = tch;
                }
              } else {
                touchlength = touchpos = touchmove = null;
              }
          });
          addEvent(this.container, 'touchstart', function(){
            touchlength = touchpos = touchmove = null;
            map.dragged = false;
          });
          addEvent(this.container, 'touchend', function(){
            touchlength = touchpos = touchmove = null;
          });
        },

        addBubble: function(bubble, options){
          var map = this;
          var paths = options.paths || this.rootGroup.getElementsByTagName(this.canvas.mode == 'svg'? 'path': 'shape');
          if (!this.hasTouch){
            for(var i=paths.length;i--;){
              var path = paths[i];
              addEvent(path, 'mousemove', function(e){
                var target = e.target || e.srcElement;
                options.mousemove.call(target, pageXY(e));
                // options.mousemove.call(this, pageXY(e)); XXX this doesn't work in IE for unknown reason
              });
              addEvent(path, 'mouseover', function(e){
                var target = e.target || e.srcElement;
                options.mouseover.call(target, pageXY(e));
                options.mousemove.call(target, pageXY(e)); // for IE, since mousemove in IE is called first
                // options.mouseover.call(this, pageXY(e)); XXX this doesn't work in IE for unknown reason
              });
              addEvent(path, 'click', function(e){
                if (map.dragged){ return; }
                options.click.call(this, e);
              });
              addEvent('mouseout', options.unhover);
            }

            addEvent(bubble, 'mousemove', function(e){
              var target = e.target || e.srcElement;
              var mouseCoords = pageXY(e);
              target.style.left = (mouseCoords.pageX + 5) + 'px';
              //this.style.left = (mouseCoords.pageX + 5) + 'px'; XXX this doesn't work in IE for unknown reason
             });
          } else {
            var touched = null;
            for(var i=paths.length;i--;){
              var path = paths[i];
              addEvent(path, 'touchstart', function(e){
                var touches = e.touches;
                if (touches.length == 1){
                  this.mouseCoords = {pageX: touches.item(0).pageX,
                                      pageY: touches.item(0).pageY};
                  //preventDefault(e);
                }
              });
              addEvent(path, 'touchend', function(e){
                if(!map.dragged){
                  if(touched == this){
                    options.click.call(this, e);
                  } else {
                    options.mouseover.call(this, this.mouseCoords);
                    options.mousemove.call(this, this.mouseCoords);
                  }
                  touched = this;
                }
                //e.preventDefault();
              });
            }

            addEvent(bubble, 'touchmove', function(e){
              this.style.display = 'none';
              touched = false;
            });
            addEvent(bubble, 'touchend', function(e){
              this.style.display = 'none';
              options.click.call(this, e);
            });
          }
        },
        addShadowStyle: function(color, dx, dy, blur){
          var canvas = this.canvas;
          if (canvas.mode == 'svg') {
            var def = canvas.createSvgNode('defs');
            var filter = canvas.createSvgNode('filter');
            // ID should be unique even if there are two SVGS on the page
            filter.setAttribute('id', 'inner-shadow-'+this.index);
            def.appendChild(filter);

            // Shadow Offset
            var el = canvas.createSvgNode('feOffset');
            el.setAttribute('dx', dx); el.setAttribute('dy', dy);
            filter.appendChild(el);

            // Shadow Blur
            el = canvas.createSvgNode('feGaussianBlur');
            el.setAttribute('stdDeviation', blur); el.setAttribute('result', 'offset-blur');
            filter.appendChild(el);

            // Invert the drop shadow to create an inner shadow
            var el = canvas.createSvgNode('feComposite');
            el.setAttribute('operator', 'out'); el.setAttribute('in', 'SourceGraphic');
            el.setAttribute('in2', 'offset-blur'); el.setAttribute('result', 'inverse');
            filter.appendChild(el);

            // Color & Opacity
            var el = canvas.createSvgNode('feFlood');
            el.setAttribute('flood-color', color); el.setAttribute('flood-opacity', '0.75');
            el.setAttribute('result', 'color');
            filter.appendChild(el);

            // Clip color inside shadow
            var el = canvas.createSvgNode('feComposite');
            el.setAttribute('operator', 'in'); el.setAttribute('in', 'color');
            el.setAttribute('in2', 'inverse'); el.setAttribute('result', 'shadow');
            filter.appendChild(el);

            // Put shadow over original object
            var el = canvas.createSvgNode('feComposite');
            el.setAttribute('operator', 'over'); el.setAttribute('in', 'shadow');
            el.setAttribute('in2', 'SourceGraphic');
            filter.appendChild(el);

            canvas.canvas.insertBefore(def, this.rootGroup);
          }
      }
    }
    WorldMap.mapIndex = 1;

    /*
     *  ====================== Framework compatibility layer ============================
     *  Redefine if u don't using neither MooTools nor jQuery
     */

    if (typeof MooTools != 'undefined'){
      extend(WorldMap.prototype, {
        containerPosition: function(){
          return this.container.getPosition();
        },
        containerWidth: function(){
          return this.container.getWidth();
        },
        containerHeight: function(){
          return this.container.getHeight();
        }
      });
    } else if (typeof jQuery != 'undefined') {
      extend(WorldMap.prototype, {
        containerPosition: function(){
          var offset = jQuery(this.container).offset();
          return {x: offset.left, y: offset.top};
        },
        containerWidth: function(){
          return jQuery(this.container).width();
        },
        containerHeight: function(){
          return jQuery(this.container).height();
        }
      });
    }

    /*
     * ================================== ColorScale ==================
     */

    var ColorScale = function(colors, normalizeFunction, minValue, maxValue) {
        if (colors) this.setColors(colors);
        if (normalizeFunction) this.setNormalizeFunction(normalizeFunction);
        if (minValue) this.setMin(minValue);
        if (minValue) this.setMax(maxValue);
    }

    ColorScale.prototype = {
        colors: [],

        setMin: function(min) {
            this.clearMinValue = min;
            if (typeof this.normalize === 'function') {
                this.minValue = this.normalize(min);
            } else {
                this.minValue = min;
            }
        },

        setMax: function(max) {
            this.clearMaxValue = max;
            if (typeof this.normalize === 'function') {
                this.maxValue = this.normalize(max);
            } else {
                this.maxValue = max;
            }
        },

        setColors: function(colors) {
            for (var i=0; i<colors.length; i++) {
                colors[i] = ColorScale.rgbToArray(colors[i]);
            }
            this.colors = colors;
        },

        setNormalizeFunction: function(f) {
            if (f === 'polynomial') {
                this.normalize = function(value) {
                    return Math.pow(value, 0.2);
                }
            } else if (f === 'linear') {
                delete this.normalize;
            } else {
                this.normalize = f;
            }
            this.setMin(this.clearMinValue);
            this.setMax(this.clearMaxValue);
        },

        getColor: function(value) {
            if (typeof this.normalize === 'function') {
                value = this.normalize(value);
            }
            var lengthes = [];
            var fullLength = 0;
            var l;
            for (var i=0; i<this.colors.length-1; i++) {
                l = this.vectorLength(this.vectorSubtract(this.colors[i+1], this.colors[i]));
                lengthes.push(l);
                fullLength += l;
            }
            var c = (this.maxValue - this.minValue) / fullLength;
            for (i=0; i<lengthes.length; i++) {
                lengthes[i] *= c;
            }
            i = 0;
            value -= this.minValue;
            while (value - lengthes[i] >= 0) {
                value -= lengthes[i];
                i++;
            }
            var color;
            if (i == this.colors.length - 1) {
                color = this.vectorToNum(this.colors[i]).toString(16);
            } else {
                color = (
                    this.vectorToNum(
                        this.vectorAdd(this.colors[i],
                            this.vectorMult(
                                this.vectorSubtract(this.colors[i+1], this.colors[i]),
                                (value) / (lengthes[i])
                            )
                        )
                    )
                ).toString(16);
            }

            while (color.length < 6) {
                color = '0' + color;
            }
            return '#'+color;
        },

        vectorToNum: function(vector) {
            var num = 0;
            for (var i=0; i<vector.length; i++) {
                num += Math.round(vector[i])*Math.pow(256, vector.length-i-1);
            }
            return num;
        },

        vectorSubtract: function(vector1, vector2) {
            var vector = [];
            for (var i=0; i<vector1.length; i++) {
                vector[i] = vector1[i] - vector2[i];
            }
            return vector;
        },

        vectorAdd: function(vector1, vector2) {
            var vector = [];
            for (var i=0; i<vector1.length; i++) {
                vector[i] = vector1[i] + vector2[i];
            }
            return vector;
        },

        vectorMult: function(vector, num) {
            var result = [];
            for (var i=0; i<vector.length; i++) {
                result[i] = vector[i] * num;
            }
            return result;
        },

        vectorLength: function(vector) {
            var result = 0;
            for (var i=0; i<vector.length; i++) {
                result += vector[i]*vector[i];
            }
            return Math.sqrt(result);
        }
    }

    ColorScale.arrayToRgb = function(ar) {
        var rgb = '#';
        var d;
        for (var i=0; i<ar.length; i++) {
            d = ar[i].toString(16);
            rgb += d.length == 1 ? '0'+d : d;
        }
        return rgb;
    }

    ColorScale.rgbToArray = function(rgb) {
      if (typeof rgb == 'string'){
        rgb = rgb.substr(1);
        return [parseInt(rgb.substr(0, 2), 16), parseInt(rgb.substr(2, 2), 16), parseInt(rgb.substr(4, 2), 16)];
      }
      return rgb;
    }

})();
