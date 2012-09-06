(function(){
  function run_map(container, options, data){
    var last_hover, current_scale;

    var style = {CL1:'#f0f0f0', // default stroke
                 CL2:'#a3a3a3', // default bg
                 CL3: '#f0f0f0', // hover stroke
                 CL4:'#0e7bb6', // hover color
                 CL5:'#f0f0f0', // inactive stroke
                 CL6:'#cdcdcd', // inactive color
                 ST1:1, ST2:1};

    $(container).css('height', $(container).width() * options.svg_height / options.svg_width);

    /*
     * Bubble creation
     */
    var bubble = $('#map-bubble');
    if (!bubble.length){
      bubble = $('<div id="map-bubble"><div class="map-bubble-content"><div class="map-bubble-img"><img src="/favicon.ico" alt=""></div><a></a><p></p></div><div id="regiontitle"></div></div>');
      bubble.appendTo(document.body);
    }
    var regiontitle = bubble.find('#regiontitle');

    /*
     * Scale widget
     */
    var scale_display = $('<div class="map-scale-display"><div></div></div>').appendTo(container).find('div');
    var scale = $('<div class="map-scale"><a class="scale-minus">−</a><a class="scale-plus">+</a></div>').appendTo(container);
    scale.find('a').bind('click', function(){
      var scale = $(this).hasClass('scale-plus')? map.scale / 0.729: map.scale * 0.729;
      scale = map.correctScale(scale);

      var scaleTranslateCoeff = 1/map.scale - 1/scale;

      map.transX -= scaleTranslateCoeff * map.width / 2;
      map.transY -= scaleTranslateCoeff * map.height / 2;
      map.scale = scale;

      map.applyTransform()
    });


    /* ============= Map ============= */
    options = $.extend({}, options, {
      'color': style.CL2,
      'stroke': [style.CL1, style.ST1],
      'onTransform': function(){
         // onResize event
         if(map.scale != current_scale){
           scale_display.css({
             'width': scale_display.parent().width() * (map.scale - map.baseScale) / (map.getMaxScale() - map.baseScale)
           });
           if(map.scale == map.getMaxScale()){
            scale.find('.scale-plus').addClass('inactive');
           } else {
            scale.find('.scale-plus').removeClass('inactive');
           }
           if(map.scale == map.getMinScale()){
            scale.find('.scale-minus').addClass('inactive');
           } else {
            scale.find('.scale-minus').removeClass('inactive');
           }

           var paths = $(map.rootGroup).find(path_tag);
           for (var i=paths.length;i--;){
             paths[i].setStroke(null, style.ST1 / map.scale);
           }
           current_scale = map.scale;
         }
         bubble.css('display', 'none'); // XXX
      }
    });

    var map = vectorMap(container, options);
    map.addShadowStyle('black', options.shadow, options.shadow, Math.round(options.shadow * 0.8));
    map.onTransform();

    var path_tag = map.canvas.mode == 'svg'? 'path': 'shape';

    var paths = $(map.rootGroup).find(path_tag).each(function(){
      var code = this.id.split('_')[1];
      if (!(code in data) || !data[code].visittext){
        this.setStroke(style.CL5, style.ST1 / map.scale).setFill(style.CL6);
      }
    });

    map.addBubble(bubble[0], {
      'mouseover': function(mouseCoords){
        var code = this.id.split('_')[1];
        map.reorder(code);
        if (code in data) { bubble.show(); } else { bubble.hide(); }
        if (code in data && data[code].visittext){
          bubble.addClass('has-news');
          bubble.find('a').text(data[code].visittext).attr('href', data[code].url || '#');
          bubble.find('p').text(data[code].visitdate || '');
          if (data[code].image){
            bubble.addClass('has-image');
            bubble.find('img').attr({'alt': data[code].visittext,
                                     'src': data[code].image});
          } else {
            bubble.removeClass('has-image');
          }
        } else {
          bubble.removeClass('has-news').removeClass('has-image');
        }
      }, 
      'mousemove': function(mouseCoords){
        var code = this.id.split('_')[1];
        if (code in data){
          var x = mouseCoords.pageX - (data[code].image? 80: 25);
          bubble.css({'top': mouseCoords.pageY - 30 - bubble.height(),
                      'left': x});
        }
      },
      'click': function(){
        var code = this.id.split('_')[1];
        if(code in data && data[code].url) window.location = data[code].url;
      },
      'unhover': unhover
    });

    if (!map.hasTouch){
      $(container).bind('mouseleave', unhover);
    }

    function unhover(){
      map.reorder();
      bubble.hide();
    }

    map.makeDraggable();

    map.reorder = function(code){
      if (map.active_item){
        if (map.active_code in data && data[map.active_code].visittext){
          map.active_item.setStroke(style.CL1, style.ST1 / map.scale).setFill(style.CL2);
        } else {
          map.active_item.setStroke(style.CL5, style.ST1 / map.scale).setFill(style.CL6);
        }
        if(map.canvas.mode == 'svg'){
          map.active_item.setAttribute('style', '');
        }
        map.active_item = null;
      }

      if ( code && ! (code in data) && window.console){
        /* // */window.console.warn('unknown country: ' + code);
      }
      if (code && code in data){
        map.active_code = code;
        map.active_item = map.getPath(code);
        if (data[code].visittext){
          if(map.canvas.mode == 'svg'){
            map.active_item.setAttribute('style', 'filter: url(#inner-shadow-'+map.index+');');
          }
          map.active_item.setFill(style.CL4).setStroke(style.CL3, style.ST2/map.scale);
        }/* else {
          map.active_item.setFill(style.CL2).setStroke(style.CL3, style.ST2/map.scale);
        }*/
        map.rootGroup.appendChild(map.active_item);
        regiontitle.text(data[code].title);
      } else {
        regiontitle.text('');
      }
    }
    return map;
  }

  var options = {
    'russia': {
          'svg_width': 1000, // XXX magic numbers, need to be computed
          'svg_height': 580,
          'maxScale': 'x2.2',
          'shadow': 8
    },
    'world': {
          'svg_width': 580, // XXX magic numbers, need to be computed
          'svg_height': 326,
          'maxScale': 'x4',
          'shadow': 3
    }
  }


  window.loadAndRunMap = function(map, url){
    var maploaded = false, domready = false, data;

    $(function(){
      domready = true;
      if (maploaded && options[map].paths) go();
    });
    $.ajax({
      'url': url,
      'dataType': 'json',
      'success': function(resp){
        data = resp;
        maploaded = true;
        if (domready && options[map].paths) go();
      }
    });
    if(!options[map].paths){
      $.ajax({
        'url': '/static/data/map_paths_' + map + '.js',
        'dataType': 'json',
        'success': function(resp){
          options[map].paths = resp;
          if (domready && maploaded) go();
        }
      });
    }

    function go(){
      run_map(document.getElementById('map_' + map), options[map], data);
    }
  }
})();


