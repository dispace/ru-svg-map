function simplifySvgPath(path, aggressive) {
    path = path.split(' ');
    var last_command, cx=0, cy=0;
    var bad_commands = 'mclvh';
    var result = [];
    var j=0, i=0, coords = []
    var commands = 'MCLHVmclhvz';

    var skip = false;
    function put_point(letter, cx, cy){
      if(aggressive){
        if (letter == 'L'){
          skip = !skip;
          if (!skip){ return }
        } else{
          skip = false;
        }
      }
      result.push(letter +' ' + cx.toPrecision(3) + ',' + cy.toPrecision(3));
    }


    while (i < path.length){
        if (path[i] == 'z'){
            result.push('z');
            first_coord = null;
            i++;
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
                return parseFloat(coord);
            }
            switch (last_command) {
                case 'm':
                    cx += get_coord();
                    cy += get_coord();
                    put_point('M', cx, cy);
                break;
                case 'M':
                    cx = get_coord();
                    cy = get_coord();
                    put_point('M', cx, cy);
                break;
                case 'l':
                    cx += get_coord();
                    cy += get_coord();
                    put_point('L', cx, cy);
                break;
                case 'L':
                    cx = get_coord();
                    cy = get_coord();
                    put_point('L', cx, cy);
                break;
                case 'h':
                    cx += get_coord();
                    put_point('L', cx, cy);
                break;
                case 'H':
                    cx = get_coord();
                    put_point('L', cx, cy);
                break;
                case 'v':
                    cy += get_coord();
                    put_point('L', cx, cy);
                break;
                case 'V':
                    cy = get_coord();
                    put_point('L', cx, cy);
                break;
                case 'c':
                    get_coord();get_coord();
                    get_coord();get_coord();
                    cx += get_coord();
                    cy += get_coord();

                    put_point('L', cx, cy);
                break;
                case 'C':
                    get_coord();get_coord();
                    get_coord();get_coord();
                    cx = get_coord();
                    cy = get_coord();

                    put_point('L', cx, cy);
                break;
            }
        }
    }
    return result.join(' ');
}

function simplifyMap(map, aggressive){
  var result = {};
  for(key in map){
    result[key] = simplifySvgPath(map[key], aggressive);
  }
  return result
}
