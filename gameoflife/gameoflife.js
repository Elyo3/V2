var canvas;
var gl;

var numVertices  = 36;

var points = [];
var gameArea = [];
var oldArea = [];
var colors = [];

var newSets = [];

var movement = false;
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var sizeIncrease = 0.00;
var sizeShrinking = 0.05;

var matrixLoc;

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    colorCube();
    area();

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    matrixLoc = gl.getUniformLocation( program, "transform" );

    canvas.addEventListener("mousedown", function(e){
        movement = true;
        origX = e.offsetX;
        origY = e.offsetY;
        e.preventDefault();
    } );

    canvas.addEventListener("mouseup", function(e){
        movement = false;
    } );

    canvas.addEventListener("mousemove", function(e){
        if(movement) {
    	    spinY = ( spinY + (origX - e.offsetX) ) % 360;
            spinX = ( spinX + (origY - e.offsetY) ) % 360;
            origX = e.offsetX;
            origY = e.offsetY;
        }
    } );
    
    render();
    gameloop();
}


function area() {
    for (var i = 0; i < 10; i++){
        gameArea[i] = [];
        oldArea[i] = [];
        for (var j = 0; j < 10; j++){
            gameArea[i][j] = [];
            oldArea[i][j] = []
            for (var p = 0; p < 10; p++){
                gameArea[i][j][p] = Math.random() > 0.7 ? 1 : 0;
                oldArea[i][j][p] = 0;
            }
        }
    }
}

function colorCube() {
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}


function quad(a, b, c, d) {
    const vertices = [
        vec3(-0.45, -0.45, 0.45),
        vec3(-0.45, 0.45, 0.45),
        vec3(0.45, 0.45, 0.45),
        vec3(0.45, -0.45, 0.45),
        vec3(-0.45, -0.45, -0.45),
        vec3(-0.45, 0.45, -0.45),
        vec3(0.45, 0.45, -0.45),
        vec3(0.45, -0.45, -0.45)
    ];

    const vertexColors = [
        [0.0, 0.0, 0.0, 1.0],  // black
        [1.0, 1.0, 0.0, 1.0],  // yellow
        [1.0, 0.0, 0.0, 1.0],  // red
        [0.0, 0.0, 1.0, 1.0],  // blue
        [0.0, 1.0, 0.0, 1.0],  // green
        [0.0, 1.0, 1.0, 1.0],  // cyan
        [1.0, 0.0, 1.0, 1.0],  // magenta
        [1.0, 1.0, 1.0, 1.0]   // white
    ];

    const indices = [a, b, c, a, c, d];

    indices.forEach(index => {
        points.push(vertices[index]);
        colors.push(vertexColors[a]);
    });
}


function checkIfDead() {
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            for (let p = 0; p < 10; p++) {
                if (gameArea[i][j][p] === 1) {
                    return false;
                }
            }
        }
    }
    return true;
}


function reactiveBlocks() {
    // Copy current game area to old area
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            for (let p = 0; p < 10; p++) {
                oldArea[i][j][p] = gameArea[i][j][p];
            }
        }
    }

    // Update game area based on neighbor counts
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            for (let p = 0; p < 10; p++) {
                let count = 0;

                // Count neighbors
                for (let u = i - 1; u <= i + 1; u++) {
                    for (let g = j - 1; g <= j + 1; g++) {
                        for (let h = p - 1; h <= p + 1; h++) {
                            count += oldArea[(u + 10) % 10][(g + 10) % 10][(h + 10) % 10];
                        }
                    }
                }

                // Adjust count for the current cell
                if (oldArea[i][j][p] === 1) {
                    count--;
                }

                // Determine cell's next state
                if (oldArea[i][j][p] === 1 && (count < 5 || count > 7)) {
                    gameArea[i][j][p] = 0;
                    console.log(`Point died at x: ${i}, y: ${j}, z: ${p}`);
                } else if (oldArea[i][j][p] === 0 && count === 6) {
                    gameArea[i][j][p] = 1;
                    console.log("Point revived");
                } else {
                    gameArea[i][j][p] = oldArea[i][j][p];
                }
            }
        }
    }
}


function gameloop() {
    if (!checkIfDead()) {
        sizeIncrease = 0;
        reactiveBlocks();
        setTimeout(gameloop, 2000);
    }
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    sizeIncrease = Math.min(sizeIncrease + 0.02, 0.99);

    let mv = mat4();
    mv = mult(mv, rotateX(spinX));
    mv = mult(mv, rotateY(spinY));
    mv = mult(mv, scalem(0.05, 0.05, 0.05));

    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            for (let p = 0; p < 10; p++) {
                let mv1 = mult(mv, translate(i - 5, j - 5, p - 5));

                if (gameArea[i][j][p] === 1 && oldArea[i][j][p] === 0) {
                    mv1 = mult(mv1, scalem(sizeIncrease - 0.01, sizeIncrease - 0.01, sizeIncrease - 0.01));
                } else if (gameArea[i][j][p] === 0 && oldArea[i][j][p] === 1) {
                    mv1 = mult(mv1, scalem(1 - sizeIncrease, 1 - sizeIncrease, 1 - sizeIncrease));
                } else if (gameArea[i][j][p] !== 1) {
                    continue;
                }

                gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1));
                gl.drawArrays(gl.TRIANGLES, 0, numVertices);
            }
        }
    }

    requestAnimFrame(render);
}

