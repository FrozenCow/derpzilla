define(['platform', 'game', 'vector', 'staticcollidable', 'linesegment', 'editor', 'required', 'state', 'level', 'mouse', 'collision', 'keyboard', 'quake', 'resources', 'objectmanager','graphics', 'particleemitter'], function(platform, Game, Vector, StaticCollidable, LineSegment, editor, required, state, level, mouse, collision, keyboard, quake, resources, ObjectManager,Graphics, ParticleEmitter) {
    var t = new Vector(0, 0);
    var t2 = new Vector(0, 0);
    var rs = {
        'images': ['test'],
        'audio': ['test']
    };
    var g, game;
    platform.once('load', function() {
        var canvas = document.getElementById('main');
        game = g = new Game(startGame, canvas, [required(['chrome']), mouse, keyboard, resources(rs), state, level, collision, quake]);
        g.resources.status.on('changed', function() {
            g.graphics.context.clearRect(0, 0, game.width, game.height);
            g.graphics.context.fillStyle = 'black';
            g.graphics.context.font = 'arial';
            g.graphics.fillCenteredText('Preloading ' + g.resources.status.ready + '/' + g.resources.status.total + '...', 400, 300);
        });
    });

    function startGame(err) {
        if (err) {
            console.error(err);
        }
        var images = g.resources.images;
        var audio = g.resources.audio;

        for(var k in audio) {
            var a = audio[k];
            if (!a instanceof Audio) { continue; }
            a.volume = 0.6;
        }

        g.objects.lists.particle = g.objects.createIndexList('particle');
        g.objects.lists.spring = g.objects.createIndexList('spring');
        g.objects.lists.start = g.objects.createIndexList('start');
        g.objects.lists.finish = g.objects.createIndexList('finish');
        g.objects.lists.enemy = g.objects.createIndexList('enemy');
        g.objects.lists.usable = g.objects.createIndexList('usable');
        g.objects.lists.collectable = g.objects.createIndexList('collectable');
        g.objects.lists.shadow = g.objects.createIndexList('shadow');
        g.objects.lists.background = g.objects.createIndexList('background');
        g.objects.lists.foreground = g.objects.createIndexList('foreground');
        g.objects.lists.grounded = g.objects.createIndexList('grounded');

        var background = document.getElementById('background');
        var backgroundContext = background.getContext('2d');

        // Gravity.
        g.gravity = (function() {
         var me = {
             enabled: true,
             enable: enable,
             disable: disable,
             toggle: toggle
         };
         function enable() { me.enabled = true; }
         function disable() { me.enabled = false; }
         function toggle() { if (me.enabled) disable(); else enable(); }
         function update(dt,next) {
             g.objects.lists.particle.each(function(p) {
                 if (me.enabled) {
                     p.velocity.y += 200*dt;
                 }
             });
             next(dt);
         }
         g.chains.update.push(update);
         return me;
        })();
        // Auto-refresh
        // (function() {
        //  var timeout = setTimeout(function() {
        //      document.location.reload(true);
        //  }, 3000);
        //  g.once('keydown',function() {
        //      disable();
        //  });
        //  g.once('mousemove',function() {
        //      disable();
        //  });
        //  g.chains.draw.unshift(draw);
        //  function draw(g,next) {
        //      // console.log(game.chains.draw.slice(0));
        //      g.fillStyle('#ff0000');
        //      g.fillCircle(game.width,0,30);
        //      g.fillStyle('black');
        //      next(g);
        //  }
        //  function disable() {
        //      clearTimeout(timeout);
        //      g.chains.draw.remove(draw);
        //  }
        // })();
        // Camera
        (function() {
            game.camera = new Vector(0,0);
            game.camera.zoom = 1;
            game.camera.PTM = 1;
            game.camera.x = -(game.width * 0.5) / getPixelsPerMeter();
            game.camera.y = (game.height * 0.5) / getPixelsPerMeter();
            game.camera.screenToWorld = function(screenV, out) {
                var ptm = getPixelsPerMeter();
                out.x = screenV.x / ptm + game.camera.x;
                out.y = -(screenV.y / ptm - game.camera.y);
            };
            game.camera.worldToScreen = function(worldV, out) {
                var ptm = getPixelsPerMeter();
                out.x = (worldV.x - game.camera.x) * ptm;
                out.y = (worldV.y - game.camera.y) * ptm * -1;
            };
            game.camera.getPixelsPerMeter = getPixelsPerMeter;

            function getPixelsPerMeter() {
                return game.camera.PTM / game.camera.zoom;
            }
            game.camera.reset = function() {
                var ptm = getPixelsPerMeter();
                var targetx = player.position.x - (game.width * 0.5) / ptm;
                var targety = player.position.y + (game.height * 0.5) / ptm;
                targetx += player.velocity.x * 10;
                targety += player.velocity.y * 10;
                game.camera.x = targetx;
                game.camera.y = targety;
            };
            var pattern;

            function drawCamera(g, next) {
                var ptm = getPixelsPerMeter();
                // g.save();
                // g.context.translate(-x*ptm,y*ptm);
                // g.fillStyle(pattern);
                // g.fillRectangle(x*ptm,-y*ptm,game.width,game.height);
                // g.restore();
                g.save();
                g.context.scale(ptm, -ptm);
                g.context.lineWidth /= ptm;
                g.context.translate(-game.camera.x, -game.camera.y);
                next(g);
                g.restore();
            }

            function updateCamera(dt, next) {
                next(dt);
                var ptm = getPixelsPerMeter();
                // if (!pattern) {
                //   pattern = g.context.createPattern(images.background,'repeat');
                // }
                // Follow player
                var targetx = player.position.x - (game.width * 0.5) / ptm;
                var targety = (game.height * 0.5) / ptm;
                // Look forward
                // targetx += player.velocity.x * 10;
                // targety += player.velocity.y * 10;
                // Smooth
                // game.camera.x = 0.8 * game.camera.x + 0.2 * targetx;
                // game.camera.y = 0.8 * game.camera.y + 0.2 * targety;
                // No smoothing
                game.camera.x = Math.max(game.camera.x+1, targetx);
                game.camera.y = targety;
            }

            g.chains.update.camera = updateCamera;
            g.chains.update.push(updateCamera);

            g.chains.draw.camera = drawCamera;
            g.chains.draw.insertBefore(drawCamera, g.chains.draw.objects);
        })();

        // Draw background
        // (function() {
        //     game.chains.draw.insertBefore(function(g,next) {
        //         fill(g,images.background, game.camera.x * 0.5, game.camera.y, game.width, game.height);
        //         g.translate(0,game.height-images.mountains.height+100,function() {
        //             fill(g,images.mountains, game.camera.x * 0.8, game.camera.y, game.width, 0);
        //         });
        //         next(g);
        //     },game.chains.draw.camera);

        //     function fill(g,image,originx,originy, width, height) {
        //         var startx = Math.floor(originx / image.width) * image.width - originx;
        //         var starty = Math.floor(originy / image.height) * image.height - originy;
        //         for(var x=startx;x<width;x += image.width) {
        //         for(var y=starty;y<height;y +=image.height) {
        //             g.drawImage(image, x, y);
        //         }
        //         }
        //     }
        // })();

        // Collision
        var handleCollision = (function() {
            var t = new Vector(0, 0)
            var t2 = new Vector(0, 0);

            return function handleCollision(chunks) {
                chunks.forEach(function(chunk) {
                    chunk.objects.lists.collide.each(function(o) {
                        if (!o.velocity) {
                            return;
                        }
                        o.surface = null;
                        var iterations = 5;
                        while (iterations-- > 0) {
                            var collisions = [];

                            function handleCollisionLineSegments(lineSegments) {
                                for (var i = 0; i < lineSegments.length; i++) {
                                    var lineSegment = lineSegments[i];
                                    t.setV(lineSegment.normal);
                                    t.normalRight();
                                    var l = lineSegment.start.distanceToV(lineSegment.end);
                                    t2.setV(o.position);
                                    t2.substractV(lineSegment.start);
                                    var offY = lineSegment.normal.dotV(t2) - o.collisionRadius;
                                    var offX = t.dotV(t2);
                                    if (offY < -o.collisionRadius * 2) {
                                        continue;
                                    } else if (offY < 0) {
                                        if (offX > 0 && offX < l) {
                                            offY *= -1;
                                            collisions.push({
                                                x: lineSegment.start.x + t.x * offX,
                                                y: lineSegment.start.y + t.y * offX,
                                                normalx: lineSegment.normal.x,
                                                normaly: lineSegment.normal.y,
                                                offset: offY
                                            });
                                        } else if (offX < 0 && offX > -o.collisionRadius) {
                                            var d = o.position.distanceToV(lineSegment.start);
                                            if (d < o.collisionRadius) {
                                                t.setV(o.position);
                                                t.substractV(lineSegment.start);
                                                t.normalize();
                                                collisions.push({
                                                    x: lineSegment.start.x,
                                                    y: lineSegment.start.y,
                                                    normalx: t.x,
                                                    normaly: t.y,
                                                    offset: o.collisionRadius - d
                                                });
                                            }
                                        } else if (offX > l && offX < l + o.collisionRadius) {
                                            var d = o.position.distanceToV(lineSegment.end);
                                            if (d < o.collisionRadius) {
                                                t.setV(o.position);
                                                t.substractV(lineSegment.end);
                                                t.normalize();
                                                collisions.push({
                                                    x: lineSegment.end.x,
                                                    y: lineSegment.end.y,
                                                    normalx: t.x,
                                                    normaly: t.y,
                                                    offset: o.collisionRadius - d
                                                });
                                            }
                                        }
                                    } else {
                                        continue;
                                    }
                                }
                            }
                            chunks.forEach(function(chunk) {
                                chunk.objects.lists.collidable.each(function(collidable) {
                                    handleCollisionLineSegments(collidable.collisionlines);
                                });
                            });
                            if (collisions.length > 0) {
                                // console.log(collisions.map(function(c) { return c.offset; }));
                                collisions.sort(function(a, b) {
                                    return b.offset - a.offset;
                                });
                                var c = collisions[0];
                                o.position.add(c.normalx * c.offset, c.normaly * c.offset);
                                var vc = o.velocity.dot(c.normalx, c.normaly);
                                o.velocity.substract(c.normalx * vc, c.normaly * vc);
                                o.surface = c;
                                if (o.collided) {
                                    o.collided(c);
                                }
                            } else {
                                break;
                            }
                        }
                        if (iterations === 0) {
                            console.error('Collision broken');
                        }
                    });
                });
            }
        }());
        // Tracing
        (function() {
            var t = new Vector(0, 0);

            function IsOnSegment(xi, yi, xj, yj, xk, yk) {
                return (xi <= xk || xj <= xk) && (xk <= xi || xk <= xj) && (yi <= yk || yj <= yk) && (yk <= yi || yk <= yj);
            }

            function ComputeDirection(xi, yi, xj, yj, xk, yk) {
                var a = (xk - xi) * (yj - yi);
                var b = (xj - xi) * (yk - yi);
                return a < b ? -1 : a > b ? 1 : 0;
            }
            // From: http://ptspts.blogspot.nl/2010/06/how-to-determine-if-two-line-segments.html
            function DoLineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
                var d1 = ComputeDirection(x3, y3, x4, y4, x1, y1);
                var d2 = ComputeDirection(x3, y3, x4, y4, x2, y2);
                var d3 = ComputeDirection(x1, y1, x2, y2, x3, y3);
                var d4 = ComputeDirection(x1, y1, x2, y2, x4, y4);
                return (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) || (d1 == 0 && IsOnSegment(x3, y3, x4, y4, x1, y1)) || (d2 == 0 && IsOnSegment(x3, y3, x4, y4, x2, y2)) || (d3 == 0 && IsOnSegment(x1, y1, x2, y2, x3, y3)) || (d4 == 0 && IsOnSegment(x1, y1, x2, y2, x4, y4));
            }
            // From: http://www.ahristov.com/tutorial/geometry-games/intersection-lines.html
            function intersection(x1, y1, x2, y2, x3, y3, x4, y4, result) {
                var d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
                if (d == 0) return false;
                var xi = ((x3 - x4) * (x1 * y2 - y1 * x2) - (x1 - x2) * (x3 * y4 - y3 * x4)) / d;
                var yi = ((y3 - y4) * (x1 * y2 - y1 * x2) - (y1 - y2) * (x3 * y4 - y3 * x4)) / d;
                result.set(xi, yi);
                return true;
            }
            g.cantrace = function(fromx, fromy, tox, toy) {
                var result = true;
                game.objects.lists.collidable.each(function(collidable, BREAK) {
                    for (var i = 0; i < collidable.collisionlines.length; i++) {
                        var cl = collidable.collisionlines[i];
                        var fd = cl.normal.dot(fromx - tox, fromy - toy);
                        // Is collision in right direction (toward fromxy)
                        if (fd < 0) {
                            continue;
                        }
                        // Are line-segments intersecting?
                        if (!DoLineSegmentsIntersect(fromx, fromy, tox, toy, cl.start.x, cl.start.y, cl.end.x, cl.end.y)) {
                            continue;
                        }
                        result = false;
                        return BREAK;
                    }
                });
                return result;
            };
            g.trace = function(fromx, fromy, tox, toy) {
                var c = null;
                game.objects.lists.collidable.each(function(collidable) {
                    for (var i = 0; i < collidable.collisionlines.length; i++) {
                        var fd = cl.normal.dot(fromx - tox, fromy - toy);
                        // Is collision in right direction (toward fromxy)
                        if (fd < 0) {
                            return;
                        }
                        // Are line-segments intersecting?
                        if (!DoLineSegmentsIntersect(fromx, fromy, tox, toy, cl.start.x, cl.start.y, cl.end.x, cl.end.y)) {
                            return;
                        }
                        // Get intersection
                        if (!intersection(fromx, fromy, tox, toy, cl.start.x, cl.start.y, cl.end.x, cl.end.y, t)) {
                            return;
                        }
                        // Determine the closest intersecting collisionline
                        var distance = t.distanceTo(fromx, fromy);
                        if (!c || c.distance > distance) {
                            c = {
                                collidable: collidable,
                                cl: cl,
                                distance: distance,
                                x: t.x,
                                y: t.y
                            };
                        }
                    }
                });
                return c;
            }
        })();
        // Foreground and background
        (function() {
            var game = g;
            game.chains.draw.push(function(g, next) {
                game.objects.lists.background.each(function(o) {
                    o.drawBackground(g);
                });
                game.objects.lists.shadow.each(function(o) {
                    o.drawShadow(g);
                });
                game.objects.lists.foreground.each(function(o) {
                    o.drawForeground(g);
                });
                // game.objects.lists.drawItem.each(function(o) {
                //  o.drawItem(g);
                // });
                next(g);
            });
        })();
    // Touching
    (function() {
        g.objects.lists.touchable = g.objects.createIndexList('touchable');
        g.chains.update.push(function(dt,next) {
            g.objects.lists.touchable.each(function(ta) {
                g.objects.lists.touchable.each(function(tb) {
                    if (ta.position.distanceToV(tb.position) <= ta.touchRadius+tb.touchRadius) {
                        if (ta.touch) { ta.touch(tb); }
                    }
                });
            });
            next(dt);
        });
    })();

        function getAngle(v) {
            return Math.atan2(v.y,v.x);
        }
        function getAngleFrom(from,v) {
            return Math.atan2(v.y-from.y,v.x-from.x);
        }
        function getVectorFromAngle(angle,v) {
            v.set(
                Math.cos(angle),
                Math.sin(angle)
            );
        }
        function getVectorFromAngleRadius(angle,radius,v) {
            getVectorFromAngle(angle,v);
            v.multiply(radius);
        }
        function getPositionFromAngleRadius(angle,radius,position,v) {
            getVectorFromAngleRadius(angle,radius,v);
            v.addV(position);
        }

        //#gameobjects
        function circleFiller(r) {
            return function(g) {
                g.fillCircle(this.position.x, this.position.y, r);
            };
        }

        // Player
        function Player() {
            this.position = new Vector(0, 0);
            this.velocity = new Vector(0, 0);
            this.touchRadius = this.collisionRadius = 10;
        }
        (function(p) {
            p.updatable = true;
            p.foreground = true;
            p.collide = true;
            p.touchable = true;
            p.update = function(dt) {
            };
            p.draw = function(g) {
            };
            p.drawForeground = function(g) {
            };
            p.touch = function(other) {
                var me = this;

            };
        })(Player.prototype);

        function getAimPosition(t) {
            game.camera.screenToWorld(game.mouse, t);
        }

        //#states
        function gameplayState() {
            var me = {
                enabled: false,
                enable: enable,
                disable: disable
            };
            function enable() {
                player = new Player(0,0);
                g.objects.add(player);
                g.chains.update.push(update);
                // g.chains.draw.insertBefore(draw, g.chains.draw.camera);
                g.on('keydown',keydown);
            }

            function disable() {
                g.chains.update.remove(update);
                // g.chains.draw.remove(draw);
                g.removeListener('keydown',keydown);
            }

            function keydown(key) {
                if (key === 'r') {
                    game.changeState(gameplayState());
                } else if (key === 'e') {
                    game.changeState(editState());
                } else if (key === 't') {
                    audio.test.currentTime = 0;
                    audio.test.play();
                }
            }

            function log(/*...*/) {
                return function(keyPoint) {
                    var args = Array.prototype.slice.call(arguments,0);
                    args.unshift('LOG');
                    args.push(keyPoint);
                    console.log.apply(console, args);
                }
            }

            function update(dt, next) {
                next(dt);
            }

            function draw(g, next) {
                // Draw HUD
                next(g);
            }

            return me;
        }

        function editState() {
            var me = {
                enabled: false,
                enable: enable,
                disable: disable
            };

            function enable() {
            }

            function disable() {
            }
        }
        var player;

        function flatten(arr) {
            var r = [];
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].length !== undefined) {
                    r = r.concat(flatten(arr[i]));
                } else {
                    r.push(arr[i]);
                }
            }
            return r;
        }

        function rnd() {
            return (Math.random()-0.5) * 2;
        }

        function scale(v, min, max) {
            return min + (max-min)*v;
        }

        function slide(v, min, max) {
            return min + v * (max - min);
        }

        function unslide(v, min, max) {
            return (v - min) / (max-min);
        }

        function pick(arr) {
            return arr[Math.floor(Math.random()*arr.length)];
        }

        g.changeState(gameplayState());
        game.objects.handlePending();
        g.start();
    }
});