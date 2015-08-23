define(['platform', 'game', 'vector', 'staticcollidable', 'linesegment', 'editor', 'required', 'state', 'level', 'mouse', 'collision', 'keyboard', 'quake', 'resources', 'objectmanager','graphics', 'particleemitter'], function(platform, Game, Vector, StaticCollidable, LineSegment, editor, required, state, level, mouse, collision, keyboard, quake, resources, ObjectManager,Graphics, ParticleEmitter) {
    var t = new Vector(0, 0);
    var t2 = new Vector(0, 0);
    var rs = {
        'images': ['test','ground',
            'monster_body_idle', 'monster_body_fire',
            'monster_feet1', 'monster_feet2', 'monster_feet3', 'monster_feet4',
            'monster_feet_jump',
            'fire1', 'fire2', 'fire3', 'fireball',
            'building1','building2','building3','building4','building5','building6',
            'smoke1','smoke2','smoke3','smoke4','smoke5',
            'car1',
            'person1','person2','person3',
            'copter', 'copter_rotor', 'copter_back',
            'tank', 'tank_bullet',
            'flame1','flame2','flame3',
            'reactor', 'reactor_damaged',
            'title', 'controls', 'monster_corner', 'controls_plasmabreath','controls_think',
            'flower','peoplemurdered','youmonster',
            'score_3','score_5','score_10','score_50','score_100',
        ],
        'audio': ['test',
            'explode1','explode2','explode3','explode4',
            'copter_explode1',
            'tank_explode1',
            'jump1','land1',
        ]
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

        var jumpSounds = [audio.jump1];
        var landSounds = [audio.land1];
        var copterExplosionSounds = [audio.tank_explode1];
        var tankExplosionSounds = [audio.tank_explode1];
        var explosionSounds = [audio.explode1, audio.explode2, audio.explode3];

        g.objects.lists.weight = g.objects.createIndexList('hasweight');
        g.objects.lists.collidable = g.objects.createIndexList('collidable');
        g.objects.lists.temporary = g.objects.createIndexList('temporary');
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
             toggle: toggle,
             force: 0.5
         };
         function enable() { me.enabled = true; }
         function disable() { me.enabled = false; }
         function toggle() { if (me.enabled) disable(); else enable(); }
         function update(dt,next) {
             g.objects.lists.weight.each(function(p) {
                 if (me.enabled) {
                     p.velocity.y += me.force * p.weight;
                 }
             });
             next(dt);
         }
         g.chains.update.push(update);
         return me;
        })();

        // Ground-plane collision
        (function() {
            g.chains.update.push(function(dt, next) {
                g.objects.lists.collidable.each(function(c) {
                    if (c.position.y + c.collisionRadius > 0 && c.velocity.y > 0) {
                        c.position.y = -c.collisionRadius+1;
                        c.velocity.y = 0;
                        if (!c.onground) {
                            if (c.onlanded) {
                                c.onlanded();
                            }
                            c.onground = true;
                        }
                    } else {
                        c.onground = false;
                    }
                });
                next(dt);
            });
        })();

        // Remove out-of-screen temporary objects
        (function() {
            g.chains.update.push(function(dt, next) {
                next(dt);
                g.objects.lists.temporary.each(function(o) {
                    if (   o.position.x > game.camera.x + game.width*2
                        || o.position.x < game.camera.x - game.width) {
                        game.objects.remove(o);
                    }
                });
            });
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
            game.camera.smoothx = game.camera.x;
            game.camera.smoothy = game.camera.x;
            game.camera.screenToWorld = function(screenV, out) {
                var ptm = getPixelsPerMeter();
                out.x = screenV.x / ptm + game.camera.x;
                out.y = (screenV.y / ptm - game.camera.y);
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
                updateCamera(0.001);
                game.camera.x = game.camera.targetx;
                game.camera.y = game.camera.targety;
                game.camera.smoothx = game.camera.x;
                game.camera.smoothy = game.camera.y;
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
                g.context.scale(ptm, ptm);
                g.context.lineWidth /= ptm;
                g.context.translate(-game.camera.x, game.camera.y);
                next(g);
                g.restore();
            }

            function updateCamera(dt) {
                var ptm = getPixelsPerMeter();
                // if (!pattern) {
                //   pattern = g.context.createPattern(images.background,'repeat');
                // }
                // Follow player
                var targetx = game.camera.targetx = player.position.x - (game.width * 0.1) / ptm;
                var targety = game.camera.targety = (game.height * 0.9) / ptm;
                // Look forward
                // targetx += player.velocity.x * 10;
                // targety += player.velocity.y * 10;
                // Smooth
                var smoothx = game.camera.smoothx = 0.99 * game.camera.smoothx + 0.01 * targetx;
                var smoothy = game.camera.smoothy = 0.99 * game.camera.smoothy + 0.01 * targety;

                game.camera.x = Math.floor(smoothx);
                game.camera.y = Math.floor(smoothy);
                // No smoothing
                // game.camera.x = targetx;
                // game.camera.y = targety;
            }

            g.chains.update.push(g.chains.update.camera = function(dt, next) {
                next(dt);
                updateCamera(dt);
            });

            g.chains.draw.camera = drawCamera;
            g.chains.draw.insertBefore(drawCamera, g.chains.draw.objects);
        })();

        // Draw background
        // (function() {
        //     game.chains.draw.insertAfter(function(g,next) {
        //         var image = images.ground;
        //         var xstart = Math.floor(game.camera.x / image.width) * image.width;
        //         var xend = Math.floor((game.camera.x + game.width) / image.width) * image.width + image.width;

        //         var y = -image.height * 0.5;
        //         for(var x = xstart;x < xend; x += image.width) {
        //             g.drawImage(image, x, y);
        //         }
        //         next(g);
        //     }, game.chains.draw.camera);
        //     game.chains.draw.insertBefore(function(g,next) {
        //         // fill(g,images.background, game.camera.x * 0.5, game.camera.y * 0.5, game.width, game.height);
        //         // g.translate(0,game.height-images.mountains.height+100,function() {
        //         //     fill(g,images.mountains, game.camera.x * 0.8, game.camera.y, game.width, 0);
        //         // });
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

        // Draw debug objects
        // (function() {
        //     game.chains.draw.insertAfter(function(g,next) {
        //         next(g);
        //         game.objects.objects.each(function(o) {
        //             g.strokeStyle('red');
        //             g.strokeCircle(o.position.x, o.position.y, o.touchRadius || 10);
        //         });
        //     }, game.chains.draw.camera);
        // })();

        // Debug object lifetimes
        (function() {
            setInterval(function() {
                var count = 0;
                game.objects.objects.each(function(o) {
                    count++;
                });
                console.log('Living objects:', count);
            }, 5000);
        })();

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
                drawGround(g);
                game.objects.lists.foreground.each(function(o) {
                    o.drawForeground(g);
                });
                // game.objects.lists.drawItem.each(function(o) {
                //  o.drawItem(g);
                // });
                next(g);
            });

            function drawGround(g) {
                var image = images.ground;
                var left = Math.floor(game.camera.x / image.width) * image.width;
                var right = Math.ceil((game.camera.x + game.width) / image.width) * image.width;
                for(var x=left; x<=right;x+=image.width) {
                    g.drawImage(image, x, -300);
                }
            }
        })();

        // Touching
        (function() {
            g.objects.lists.touchable = g.objects.createIndexList('touchable');
            g.chains.update.insertBefore(function(dt, next) {
                next(dt);
                g.objects.lists.touchable.each(function(ta) {
                    g.objects.lists.touchable.each(function(tb) {
                        handleTouch(ta, tb);
                    });
                    if (ta.touching) {
                        ta.touching.forEach(function(tb) {
                            handleTouch(ta, tb);
                        });
                    }
                });
            }, g.chains.update.objects);

            function handleTouch(ta, tb) {
                if (ta === tb) { return; }
                var areTouching = ta._objectmanager && tb._objectmanager &&
                    ta.position.distanceToV(tb.position) <= ta.touchRadius + tb.touchRadius;
                if (ta.touching) {
                    var tbWasTouchingTa = ta.touching.indexOf(tb) !== -1;
                    if (areTouching && !tbWasTouchingTa) {
                        ta.touching.push(tb);
                        if (ta.touch) { ta.touch(tb); }
                    } else if (!areTouching && tbWasTouchingTa) {
                        ta.touching.remove(tb);
                        if (ta.untouch) { ta.untouch(tb); }
                    }
                }
                if (tb.touching) {
                    var taWasTouchingTb = tb.touching.indexOf(ta) !== -1;
                    if (areTouching && !taWasTouchingTb) {
                        tb.touching.push(ta);
                        if (tb.touch) { tb.touch(ta); }
                    } else if (!areTouching && taWasTouchingTb) {
                        tb.touching.remove(ta);
                        if (tb.untouch) { tb.untouch(ta); }
                    }
                }
            }
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

        function addScore(score, x, y) {
            player.score += score;
            game.objects.add(new ScoreIndicator(score, x,y));
        }

        function ScoreIndicator(score,x,y) {
            this.image = images['score_' + score];
            this.position = new Vector(x,y);
            this.time = 0;
        }
        (function(p) {
            p.foreground = true;
            p.updatable = true;
            p.temporary = true;
            p.update = function(dt) {
                this.time += 1;
                if (this.time > 60) {
                    game.objects.remove(this);
                }
            };
            p.drawForeground = function(g) {
                g.drawCenteredImage(
                    this.image,
                    this.position.x,
                    this.position.y - Math.floor(this.time * 0.5)
                    );
            };
        })(ScoreIndicator.prototype);

        // Player
        function Player() {
            this.position = new Vector(0, 0);
            this.velocity = new Vector(0, 0);
            this.weight = 1;
            this.touchRadius = this.collisionRadius = 200;
            this.movement = 0;
            this.animationtime = 0;
            this.touching = [];
            this.onground = true;
            this.health = 9000;
            this.canfire = false;
            this.score = 0;
        }
        (function(p) {
            var fireOffset = new Vector(0, -35);
            var feetFrames = [
                images.monster_feet1,
                images.monster_feet2,
                images.monster_feet3,
                images.monster_feet4,
            ];
            p.hasweight = true;
            p.updatable = true;
            p.foreground = true;
            p.collide = true;
            p.touchable = true;
            p.collidable = true;
            p.update = function(dt) {
                if (this.onground) {
                    this.velocity.x += this.movement * 0.5;
                    this.velocity.x *= 0.8;
                } else {
                    this.velocity.x += this.movement * 0.1;
                    this.velocity.x *= 0.99;
                }

                if (Math.abs(this.velocity.x) < 1) {
                    this.animationtime = 0;
                } else {
                    this.animationtime += this.velocity.x * 0.025 + feetFrames.length;
                }
                this.position.addV(this.velocity);

                if (this.firing) {
                    this.firing--;
                    if (this.firing > 20) {
                        if (this.firing % 4 === 2) {
                            game.objects.add(new Fireball(
                                this.position.x + fireOffset.x,
                                this.position.y + fireOffset.y + 0));
                        } else if (this.firing % 4 === 0) {
                            // game.objects.add(new Fireball(
                            //     this.position.x + fireOffset.x,
                            //     this.position.y + fireOffset.y + 40));
                            // game.objects.add(new Fireball(
                            //     this.position.x + fireOffset.x,
                            //     this.position.y + fireOffset.y - 40));
                        }
                    }
                }
            };
            p.drawForeground = function(g) {
                var pivotx = 40;
                var pivoty = 20;

                var imagex = this.position.x - pivotx;
                var imagey = this.position.y - pivoty;

                var leftFoot, rightFoot;
                if (this.onground) {
                    leftFoot = feetFrames[Math.ceil(this.animationtime + (feetFrames.length * 0.5)) % feetFrames.length];
                    rightFoot = feetFrames[Math.ceil(this.animationtime) % feetFrames.length];
                } else {
                    leftFoot = images.monster_feet_jump;
                    rightFoot = images.monster_feet_jump;
                }

                var body;
                var bobbing;
                if (this.firing) {
                    body = images.monster_body_fire;
                    bobbing = 0;
                } else if (this.onground) {
                    body = images.monster_body_idle;
                    bobbing = Math.cos(this.animationtime / feetFrames.length * Math.PI * 2) * 2;
                } else {
                    body = images.monster_body_idle;
                    bobbing = 0;
                }


                g.drawCenteredImage(leftFoot, imagex, imagey-10);

                g.drawCenteredImage(body, imagex, imagey + bobbing -10);

                g.drawCenteredImage(rightFoot, imagex, imagey);
            };
            p.touch = function(other) {
                var me = this;
                if (other.onhitplayer) {
                    other.onhitplayer();
                }
                if (other.isFlower) {
                    this.canthink = true;
                }
            };

            p.fire = function() {
                if (!this.canfire) { return; }
                if (this.firing) { return; }
                game.quake(1, 10);
                this.firing = 30*2;
            };

            p.jump = function() {
                if (!this.onground) { return; }
                this.velocity.y = -15;
                pick(jumpSounds).play();
            };
            p.onlanded = function() {
                this.touching.forEach(function(o) {
                    if (o.ondestroy) { o.ondestroy(); }
                });
                game.quake(0.5, 40);
                pick(landSounds).play();
            };
            p.onreactordestroyed = function() {
                this.canfire = true;
            };
        })(Player.prototype);

        function Fireball(x,y) {
            this.position = new Vector(x,y);
            this.velocity = new Vector(15,0);
            this.animationtime = Math.random() * 10;
            this.touchRadius = 30;
        }
        (function(p) {
            var fireballFrames = [
                images.fire1, images.fire2, images.fire3, images.fire2
            ];
            p.touchable = true;
            p.updatable = true;
            p.foreground = true;
            p.temporary = true;
            p.damaging = true;
            p.update = function(dt) {
                this.position.addV(this.velocity);
                this.animationtime += 1/3 * (1+rnd()*0.2);
            };
            p.drawForeground = function(g) {
                // var image = fireballFrames[Math.floor(this.animationtime) % fireballFrames.length];
                // g.drawCenteredImage(image, this.position.x, this.position.y);
                g.drawCenteredImage(images.fireball, this.position.x, this.position.y);
            };
        })(Fireball.prototype);

        function Building(image, x) {
            this.image = image;
            this.position = new Vector(x, 0);
            this.touchRadius = image.width * 0.5;
        }
        (function(p) {
            p.background = true;
            p.touchable = true;
            p.temporary = true;
            p.drawBackground = function(g) {
                g.drawImage(this.image,
                    this.position.x - this.image.width * 0.5,
                    this.position.y - this.image.height + 10
                    );
            };
            p.ondestroy = function() {
                game.objects.remove(this);
                game.objects.add(new DestroyedBuilding(this.image, this.position.x));
                addScore(50, this.position.x, this.position.y - 100);
                pick(explosionSounds).play();
            };
        })(Building.prototype);

        function Reactor(x) {
            Building.call(this, images.reactor, x);
        }
        Reactor.prototype = new Building(images.reactor);
        (function(p) {
            p.ondestroy = function() {
                if (this.image !== images.reactor_damaged) {
                    this.image = images.reactor_damaged;
                    addScore(50, this.position.x, this.position.y - 100);
                    pick(explosionSounds).play();
                } else {
                    player.onreactordestroyed();
                    Building.prototype.ondestroy.call(this);
                    addScore(100, this.position.x, this.position.y - 100);
                    pick(explosionSounds).play();
                }
            };
        })(Reactor.prototype);

        function DestroyedBuilding(image, x) {
            this.image = image;
            this.position = new Vector(x, 0);
            this.touchRadius = 1;
            this.rotation = rnd() * Math.PI * 0.1;
            this.height = image.height;
            this.smokeEmitter = new BuildingSmokeEmitter(x, image.width * 0.5);
        }
        (function(p) {
            p.background = true;
            p.updatable = true;
            p.temporary = true;
            p.update = function(dt) {
                this.height -= 1;
                if (this.height < 20) {
                    game.objects.remove(this);
                }
                this.smokeEmitter.update(dt);
            };
            p.drawBackground = function(g) {
                var me = this;
                g.translate(rnd() * 2, me.image.height-me.height, function() {
                    g.rotate(me.position.x, me.position.y, me.rotation, function() {
                        Building.prototype.drawBackground.call(me, g);
                    });
                });
                this.smokeEmitter.draw(g);
            };
        })(DestroyedBuilding.prototype);

        function BuildingSmokeEmitter(x,radius) {
            this.maxParticles = 5;
            ParticleEmitter.call(this, null, this.maxParticles, 0);
            this.position = new Vector(x, 0);
            this.radius = radius;
            this.particleIndex = 0;
            this.left = x - radius;
            this.particleSeparation = (radius * 2) / this.maxParticles;

            this.spawn(this.maxParticles);
        }
        BuildingSmokeEmitter.prototype = new ParticleEmitter();
        (function(p) {
            p.initializeParticle = function(p) {
                p.rot = rnd() * Math.PI;
                p.rotrate = rnd() * Math.PI * 0.3;
                p.velx = 0;
                p.vely = 0;
                p.posx = this.left
                    + this.particleSeparation * (this.particleIndex % this.maxParticles)
                    + rnd() * 5;
                p.posy = 0;
                p.image = pick(smokeImages);
                p.time = 10;
                this.particleIndex++;
            };
            p.drawParticle = function(p,g) {
                g.context.save();
                g.context.translate(p.posx, p.posy);
                g.context.rotate(p.rot);
                g.drawCenteredImage(p.image,0,0);
                g.context.restore();
            };
        })(BuildingSmokeEmitter.prototype);

        function Tank(x,y) {
            this.position = new Vector(x, 0);
            this.offsety = y;
            this.touchRadius = 30;
            this.firetime = 0;
        }
        (function(p) {
            p.updatable = true;
            p.foreground = true;
            p.touchable = true;
            p.temporary = true;
            var pivot = new Vector(images.tank.width/2, images.tank.height);
            p.update = function(dt) {
                this.firetime -= 1;
                if (this.firetime < 0) {
                    game.objects.add(new TankBullet(
                        this.position.x - pivot.x + 32,
                        this.position.y - pivot.y + 19 + this.offsety
                        ));
                    this.firetime = 90;
                }
            };
            p.drawForeground = function(g) {
                g.drawImage(
                    images.tank,
                    this.position.x - pivot.x,
                    this.position.y - pivot.y + this.offsety);
            };
            p.ondestroy = function() {
                game.objects.remove(this);
                game.objects.add(new DestroyedTank(this.position.x, this.position.y + this.offsety));
                addScore(5, this.position.x, this.position.y);
                pick(tankExplosionSounds).play();
            };
        })(Tank.prototype);
        function TankBullet(x,y) {
            this.position = new Vector(x,y);
            this.velocity = new Vector(-28,-11);
            this.velocity.normalize();
            this.velocity.multiply(10);
            this.touchRadius = 10;
        }
        (function(p) {
            p.updatable = true;
            p.touchable = true;
            p.foreground = true;
            p.temporary = true;
            p.update = function(dt) {
                this.position.addV(this.velocity);
            };
            p.drawForeground = function(g) {
                g.drawCenteredImage(images.tank_bullet, this.position.x ,this.position.y);
            };
            p.onhitplayer = function() {
                game.objects.remove(this);
                player.velocity.x -= 2;
            };
            p.touch = function(other) {
                console.log('touch');
            };
        })(TankBullet.prototype);
        function DestroyedTank(x,y) {
            this.image = images.tank;
            this.position = new Vector(x,y);
            this.animationtime = 0;
        }
        (function(p) {
            var pivot = new Vector(images.tank.width/2, images.tank.height);
            p.updatable = true;
            p.foreground = true;
            p.temporary = true;
            p.update = function(dt) {
                this.animationtime+=1;
                if (this.animationtime > 60*5) {
                    game.objects.remove(this);
                }
            };
            p.drawForeground = function(g) {
                g.drawImage(
                    images.tank,
                    this.position.x - pivot.x,
                    this.position.y - pivot.y);
                g.drawCenteredImage(flameImages[Math.floor(this.animationtime / 8) % flameImages.length], this.position.x, this.position.y-40);
            };
        })(DestroyedTank.prototype);

        function Copter(x,y) {
            this.position = new Vector(x, y || 0);
            this.touchRadius = 30;
            this.velocity = new Vector(-1, 0);
            this.touching = [];
            this.animationtime = 0;
        }
        (function(p) {
            p.updatable = true;
            p.foreground = true;
            p.touchable = true;
            p.damagable = true;
            p.temporary = true;
            var pivot = new Vector(40,40);
            p.update = function(dt) {
                this.position.addV(this.velocity);
                this.animationtime += 1;
            };
            p.touch = function(o) {
                if (o.damaging) {
                    game.objects.remove(this);
                    game.objects.add(new DestroyedCopter(this.position.x, this.position.y));
                    addScore(3, this.position.x, this.position.y);
                }
            };
            p.drawForeground = function(g) {
                var x = this.position.x - pivot.x;
                var y = this.position.y - pivot.y;
                g.drawImage(images.copter, x, y);
                g.rotate(x + 156, y + 24, this.animationtime * Math.PI * 0.1, function() {
                    g.drawCenteredImage(images.copter_back, x + 156, y + 24);
                });
                var flip = (this.animationtime % 10) < 5;
                g.scale(x + 41, y - 2, flip?-1:1, 1, function() {
                    g.drawCenteredImage(images.copter_rotor, x + 41, y - 2);
                });
            };
        })(Copter.prototype);

        function DestroyedCopter(x,y) {
            this.position = new Vector(x,y);
            this.velocity = new Vector(-1, 0);
            this.weight = 0.1;
            this.animationtime = 0;
        }
        (function(p) {
            p.background = true;
            p.updatable = true;
            p.hasweight = true;
            p.temporary = true;
            var pivot = new Vector(40,40);
            p.update = function(dt) {
                this.animationtime += 1;
                if (this.position.y >= 0) {
                    this.position.y = 0;
                    this.weight = 0;
                } else {
                    this.position.addV(this.velocity);
                }
            };
            p.drawBackground = function(g) {
                var me = this;
                var x = this.position.x - pivot.x;
                var y = this.position.y - pivot.y;
                g.rotate(this.position.x, this.position.y, -Math.atan2(this.velocity.y, -this.velocity.x), function() {
                    var animationtime = me.animationtime;
                    me.animationtime = 0;
                    Copter.prototype.drawForeground.call(me, g);
                    me.animationtime = animationtime;
                });
                if (this.position.y >= 0) {
                    g.drawCenteredImage(flameImages[Math.floor(this.animationtime / 8) % flameImages.length], this.position.x, this.position.y - 10);
                }
            }
        })(DestroyedCopter.prototype);

        function Flower(x) {
            this.position = new Vector(x, 0);
            this.touchRadius = 100;
            this.image = images.flower;
        }
        (function(p) {
            p.foreground = true;
            p.temporary = true;
            p.isFlower = true;
            p.touchable = true;
            p.drawForeground = function(g) {
                g.drawImage(
                    this.image,
                    this.position.x - this.image.width * 0.5,
                    this.position.y - this.image.height
                    );
            };
        })(Flower.prototype);

        var flameImages = [
            images.flame1,
            images.flame2,
            images.flame3,
        ];

        var smokeImages = [
            images.smoke1,
            images.smoke2,
            images.smoke3,
            images.smoke4,
            images.smoke5
        ];
        var buildingImages = [
            images.building1,
            images.building2,
            images.building3,
            images.building4,
            images.building5,
            images.building6
        ];

        function getAimPosition(t) {
            game.camera.screenToWorld(game.mouse, t);
        }

        player = new Player(0,0);
        g.objects.add(player);


        //#states
        function menuState() {
            var me = {
                enabled: false,
                enable: enable,
                disable: disable
            };
            function enable() {
                g.chains.draw.unshift(draw);
                g.on('keydown',keydown);
            }

            function disable() {
                g.chains.draw.remove(draw);
                g.removeListener('keydown',keydown);
            }

            function draw(g, next) {
                // next(g);
                g.drawCenteredImage(images.title, game.width * 0.5, images.title.height * 0.5);
                g.drawCenteredImage(images.controls, game.width * 0.5, game.height * 0.75);
                g.drawImage(images.monster_corner, 0, game.height - images.monster_corner.height);
            }

            function keydown() {
                game.changeState(gameplayState());
            }
            return me;
        }
        function gameplayState() {
            var me = {
                enabled: false,
                enable: enable,
                disable: disable
            };
            function enable() {
                game.camera.reset();
                game.camera.smoothx += 300;
                g.chains.update.push(update);
                g.chains.draw.unshift(draw);
                g.on('keydown',keydown);
            }

            function disable() {
                g.chains.update.remove(update);
                g.chains.draw.remove(draw);
                g.removeListener('keydown',keydown);
            }

            var firing = false;
            var hasfired = false;
            var hasthought = false;
            function keydown(key) {
                if (key === 'r') {
                    game.changeState(gameplayState());
                } else if (key === 'e') {
                    game.changeState(editState());
                } else if (key === 't') {
                    audio.test.currentTime = 0;
                    audio.test.play();
                } else if (key === 'a') {
                    player.jump();
                } else if (key === 's' && player.canfire) {
                    hasfired = true;
                    player.fire();
                } else if (key === 'c') {
                    player.position.x += 500;
                    game.camera.reset();
                } else if (key === 'd' && player.canthink) {
                    hasthought = true;
                    game.changeState(thinkState());
                }
            }

            function mousedown() {
                player.fire();
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
                player.movement = (game.keys.right?1:0)-(game.keys.left?1:0);
                next(dt);
            }

            function draw(g, next) {
                // Draw HUD
                next(g);

                if (player.canfire && !hasfired) {
                    g.drawCenteredImage(images.controls_plasmabreath, game.width * 0.5, game.height * 0.75);
                } else if (player.canthink && !hasthought) {
                    g.drawCenteredImage(images.controls_think, game.width * 0.5, game.height * 0.75);

                }
            }

            return me;
        }

        function thinkState() {
            var me = {
                enabled: false,
                enable: enable,
                disable: disable
            };

            function enable() {
                console.log('think state');
                g.chains.update.push(update);
                g.chains.draw.unshift(draw);
                g.on('keydown',keydown);
            }

            function disable() {
                g.chains.update.remove(update);
                g.chains.draw.remove(draw);
                g.removeListener('keydown',keydown);
            }

            function keydown(key) {
            }

            function update(dt, next) {
                next(dt);
            }

            function draw(g, next) {
                next(g);

                g.drawCenteredImage(images.peoplemurdered, game.width*0.5, game.height * 0.3);
                g.drawCenteredImage(images.youmonster, game.width*0.5, game.height * 0.6);

                g.font('40px Comic Sans MS');
                g.fillCenteredText(player.score, game.width*0.3-50, game.height * 0.3+20);
            }

            return me;
        }

        // var level = [[0,-99999,0],[5,1179,-16],[1,1490,-44],[3,1709,-43],[4,2300,-51],[6,2595,-58],[2,2880,-89],[3,3133,-76],[4,3384,-75],[7,4623,-357],[6,4789,-76],[3,5077,-78],[4,5331,-90],[7,5550,-337],[7,5655,-230],[7,5697,-451],[5,5774,-73],[1,6048,-95],[1,6168,-84],[3,6376,-168],[0,6815,2],[0,7672,31],[0,7726,3],[0,7731,52],[0,7783,26],[0,7826,0],[7,7953,-326],[7,8041,-247],[7,8129,-430],[7,8169,-306],[7,8327,-183],[7,9241,-362],[0,9243,1],[0,9276,24],[0,9311,59],[0,9342,3],[7,9342,-224],[0,9350,34],[0,9391,65],[0,9413,6],[0,9451,47],[7,9480,-143],[7,9483,-456],[7,9484,-304],[4,9571,-48],[7,9597,-212],[7,9655,-323],[7,9699,-500],[7,9749,-172],[7,9809,-408],[3,9838,-72],[7,9885,-214],[6,10101,-89],[4,10367,-169],[6,10629,-92],[2,10881,-255],[0,99999,0]];
        var level = [[0,-99999,0],[5,1540,-65],[1,2710,-35],[3,2917,-48],[4,3176,-104],[2,3417,-125],[1,3597,-108],[4,3790,-119],[6,4064,-107],[3,4352,-119],[2,4573,-154],[0,5982,20],[3,6209,-57],[4,6463,-101],[1,6650,-51],[6,6853,-85],[0,6926,56],[0,7034,29],[2,7100,-67],[4,7327,-81],[0,7393,64],[0,8702,63],[0,8729,17],[0,8771,65],[0,8825,24],[0,8847,51],[0,8891,23],[0,8903,2],[0,8912,53],[8,9128,25],[7,9767,-398],[7,10231,-257],[7,10814,-392],[7,11114,-297],[5,11444,-93],[2,11589,-196],[4,11813,-171],[7,11904,-336],[7,12029,-456],[6,12077,-56],[7,12110,-259],[7,12224,-371],[7,12313,-478],[7,12382,-233],[2,12405,-204],[7,12451,-342],[7,12534,-482],[7,12629,-288],[7,12632,-395],[4,12678,-114],[7,12781,-217],[7,12823,-430],[3,12949,-115],[4,13322,-91],[0,14774,54],[0,14800,14],[0,14856,53],[0,14858,3],[0,14916,17],[0,14956,46],[0,14992,12],[0,15003,67],[0,15061,29],[0,15102,58],[0,15123,11],[7,15241,-493],[7,15327,-290],[7,15501,-330],[7,15583,-534],[7,15651,-225],[7,15730,-399],[9,17000,0],[0,99999,0]];
        var objectFactories = [
            function(x,y) { return new Tank(x,y); },
            function(x,y) { return new Building(images.building1, x); },
            function(x,y) { return new Building(images.building2, x); },
            function(x,y) { return new Building(images.building3, x); },
            function(x,y) { return new Building(images.building4, x); },
            function(x,y) { return new Building(images.building5, x); },
            function(x,y) { return new Building(images.building6, x); },
            function(x,y) { return new Copter(x,y); },
            function(x,y) { return new Reactor(x); },
            function(x,y) { return new Flower(x); },
        ];

        // Object spawning
        var levelSpawner = (function() {
            var leftIndex = 0;
            var rightIndex = 0;
            game.chains.update.push(function(dt, next) {
                var leftx = game.camera.x - 200;
                var rightx = game.camera.x + game.width + 200;
                while(level[rightIndex][1] < rightx) {
                    spawn(level[rightIndex]);
                    rightIndex++;
                }
                while(leftx < level[leftIndex][1]) {
                    spawn(level[rightIndex]);
                    leftIndex--;
                }
                next(dt);
            });

            function spawn(entry) {
                var factoryIndex = entry[0];
                var objectX = entry[1];
                var objectY = entry[2];
                var obj =  objectFactories[factoryIndex](objectX, objectY);
                game.objects.add(obj);
            }

            function left() {
                return game.camera.x - 200;
            }
            function right() {
                return game.camera.x + game.width + 200;
            }

            function reset() {
                game.objects.objects.each(function(o) {
                    if (o === player) { return; }
                    game.objects.remove(o);
                });
                for(leftIndex=0;level[leftIndex][1]<left();leftIndex++) { }
                leftIndex--;
                for(rightIndex=leftIndex;level[rightIndex][1]<right();rightIndex++) { }
                for(var i=leftIndex+1;i<rightIndex;i++) {
                    spawn(level[i]);
                }
                game.objects.handlePending();
            }
            return {
                reset: reset
            };
        })();

        function editState() {
            var me = {
                enabled: false,
                enable: enable,
                disable: disable
            };

            function enable() {
                g.chains.update.unshift(update);
                g.chains.draw.push(draw);
                g.on('keydown',keydown);
                g.on('mousedown',mousedown);
            }

            function disable() {
                g.chains.update.remove(update);
                g.chains.draw.remove(draw);
                g.removeListener('keydown',keydown);
                g.removeListener('mousedown',mousedown);
            }

            var objectFactoryIndex = 0;
            function getCurrentObjectFactory() {
                return objectFactories[objectFactoryIndex % objectFactories.length];
            }
            var mousePosition = new Vector(0,0);
            var movement = 0;
            function keydown(key) {
                if (key >= '0' && key <= '9') {
                    objectFactoryIndex = key - '0';
                } else if (key === 'e') {
                    game.changeState(gameplayState());
                }
            }

            function mousedown(button) {
                level.push([objectFactoryIndex % objectFactories.length, mousePosition.x, mousePosition.y]);
                level.sort(function(a,b) {
                    return a[1] - b[1];
                });
                levelSpawner.reset(level);
                console.log(JSON.stringify(level));
            }

            function draw(g, next) {
                var objectFactory = getCurrentObjectFactory();
                var object = objectFactory(mousePosition.x, mousePosition.y);
                g.context.globalAlpha = 0.5;
                if (object.drawBackground) {
                    object.drawBackground(g);
                }
                if (object.drawForeground) {
                    object.drawForeground(g);
                }
                g.context.globalAlpha = 1;
            }

            function update(dt, next) {
                game.camera.screenToWorld(game.mouse, mousePosition);
                movement = (game.keys.right?1:0)-(game.keys.left?1:0);
                game.camera.x += movement * 10;
                if (movement !== 0) {
                    levelSpawner.reset(level);
                }
                // Disable updating.
                // next(dt);
            }

            return me;
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

        g.changeState(menuState());
        game.objects.handlePending();
        g.start();

        window.level = level;
        window.levelSpawner = levelSpawner;
        window.game = game;
    }
});