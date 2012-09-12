/*!
 *
 * Basic example of map implementation using MooTools framework.
 *
 * Copyright 2012, SmartTeleMax Ltd.
 * Licensed under the MIT license.
 *
 */
function run_map(container, options, style, data){
    /* ============= Map ============= */
    var last_hover, current_scale;

    options = Object.merge({}, options, {
      'color': style.CL2,
      'stroke': [style.CL1, style.ST1],
      'onTransform': function(){
         // onResize event
         if(map.scale != current_scale){
           $('resizer').getElement('input').value = Math.round(map.scale / map.baseScale * 100);
           var paths = map.rootGroup.getElements(path_tag);
           for (var i=paths.length;i--;){
             paths[i].setStroke(null, style.ST1 / map.scale);
           }
           current_scale = map.scale;
         }
         $('map-bubble').setStyle('display', 'none'); // XXX
      }
    });

    var map = vectorMap(container, options);
    map.onTransform();

    var path_tag = map.canvas.mode == 'svg'? 'path': 'shape';
    $(map.rootGroup).getElements(path_tag).addEvents({
      'mousemove': function(e){
        var code = this.id.split('_')[1];
        last_hover = code;

        if(e.touches){
          var mouseCoords = this.mouseCoords;
        } else {
          var mouseCoords = {x: e.event.pageX, y: e.event.pageY};
        }

        map.reorder(code);
        var bubble = $('map-bubble');
        if (data[code].bubbletitle){
          bubble.setStyles({'display': 'block',
                            'top': mouseCoords.y - 130,
                            'left': mouseCoords.x - 20});
          bubble.getElement('a').set({'text': data[code].bubbletitle,
                                      'href': data[code].url || '#'});
          bubble.getElement('p').set('text', data[code].bubbletext || '');
          if (data[code].bubbleimage){
            bubble.getElement('img').setStyle('display', 'block')
                                    .set({'alt': data[code].bubbletitle,
                                          'src': data[code].bubbleimage});
          } else {
            bubble.getElement('img').setStyle('display', 'none');
          }
        } else {
          bubble.setStyle('display', 'none');
        }
      },
      'click': function(){
        var code = this.id.split('_')[1];
        if (map.dragged){ return; }
        //map.fitToPath(this);
        //if(data[code].url) window.location = data[code].url;
      },
      'mouseout': unhover,
      'touchstart': function(e){
        if(e.touches.length == 1){
          this.mouseCoords = {x: e.touches.item(0).pageX, y: e.touches.item(0).pageY};
          e.preventDefault();
        }
      },
      'touchend': function(e){
        if(!map.dragged){
          if(map.active_item == this){
            this.fireEvent('click');
          } else {
            this.fireEvent('mousemove', e);
          }
        }
        e.preventDefault();
      }
    });
    function unhover(){
      last_hover = null;
      map.reorder();
      $('map-bubble').setStyle('display', 'none');
    }
    container.addEvent('mouseleave', unhover);

    $('map-bubble').addEvents({
      'mousemove': function(e){
        this.setStyles({'display': 'block',
                        'top': e.event.pageY- 130,
                        'left': e.event.pageX - 20});
      },
      'touchmove': function(e){
        this.setStyle('display', 'none');
      },
      'touchend': function(e){
        this.setStyle('display', 'none');
        map.active_item.fireEvent('click');
        e.stop();
      }
    });

    map.makeDraggable();

    map.reorder = function(code){
      if (map.active_item){
        map.active_item.setStroke(style.CL1, style.ST1 / map.scale).setFill(style.CL2);
        map.active_item = null;
      }

      if (code){
        //if (data[code].bubbletitle){
          map.active_item = map.getPath(code);
          map.active_item.setFill(style.CL4).setStroke(style.CL3, style.ST2/map.scale).inject(map.rootGroup);
        //}
        $('regiontitle').set('text', data[code].title);
      }
    }

    $('resizer').getElement('input').addEvent('change', function(){
      var value = this.value / 100
      if (!isNaN(value)){
        map.setScale(value * map.baseScale);
      }
    });

    return map;
}


