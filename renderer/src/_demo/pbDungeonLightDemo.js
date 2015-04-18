/**
 *
 * Empty demo file, loads a texture and sets up the renderer...
 *
 */



// created while the data is loading (preloader)
function pbDungeonLightDemo( docId )
{
	console.log( "pbDungeonLightDemo c'tor entry" );

	var _this = this;

	this.docId = docId;

	this.rttTexture = null;
	this.rttFramebuffer = null;
	this.rttRenderbuffer = null;

	// create loader with callback when all items have finished loading
	this.loader = new pbLoader( this.allLoaded, this );
	this.levelData = this.loader.loadFile( "../img/tiles/dungeon.json" );
	this.tileImg = this.loader.loadImage( "../img/tiles/gridtiles.png" );
	this.wizImg = this.loader.loadImage( "../img/wiz.png" );
	this.floorImg = this.loader.loadImage( "../img/dungeon__floor_2.jpg" );

	console.log( "pbDungeonLightDemo c'tor exit" );
}


pbDungeonLightDemo.prototype.allLoaded = function()
{
	console.log( "pbDungeonLightDemo.allLoaded" );

	this.renderer = new pbRenderer( 'webgl', this.docId, this.create, this.update, this );
};


pbDungeonLightDemo.prototype.create = function()
{
	console.log("pbDungeonLightDemo.create");

	var tileMapJSON = this.loader.getFile(this.levelData).responseText;

	// Tile Map data format:
	//
	// width: number
	// height: number
	// layers: array
	//		object:
	//			name: string ("Tile Layer 1")
	//			type: string ("tilelayer")
	//			x: number
	//			y: number
	//			width: number
	//			height: number
	//			opacity: number
	//			visible: boolean
	//	 		data: array
	// tilesets: array
	//		object:
	//			name: string ("tiles-1")
	//			firstgid: number
	//			image: string ("tiles-1.png")
	//			imagewidth: number
	//			imageheight: number
	//			margin: number
	//			spacing: number
	//			tilewidth: number
	//			tileheight: number
	//			properties: object
	// tilewidth: number (duplicate of tilesets object 'tilewidth')
	// tileheight: number (duplicate of tilesets object 'tileheight')
	// orientation: string ("orthogonal")
	// properties: object
	// version: number
	this.tileMap = JSON.parse(tileMapJSON);
	this.createSurfaces();

	// create the render-to-texture, depth buffer, and a frame buffer to hold them
	this.rttTexture = pbWebGlTextures.initTexture(gl.TEXTURE1, pbRenderer.width, pbRenderer.height);
	this.rttRenderbuffer = pbWebGlTextures.initDepth(this.rttTexture);
	this.rttFramebuffer = pbWebGlTextures.initFramebuffer(this.rttTexture, this.rttRenderbuffer);

	// set the frame buffer to be used as the destination during the draw phase of renderer.update (drawing the invaders)
   	this.renderer.useFramebuffer = this.rttFramebuffer;
   	this.renderer.useRenderbuffer = this.rttRenderbuffer;

	// create the filter destination texture and framebuffer
	this.filterTexture = pbWebGlTextures.initTexture(gl.TEXTURE2, pbRenderer.width, pbRenderer.height);
	this.filterFramebuffer = pbWebGlTextures.initFramebuffer(this.filterTexture, null);

	// set up the renderer postUpdate callback to apply the filter and draw the result on the display
    this.renderer.postUpdate = this.postUpdate;

    this.wizSurface = new pbSurface();
    // _wide, _high, _numWide, _numHigh, _imageData
    this.wizSurface.create(32, 32, 30, 4, this.loader.getFile( this.wizImg ));
    this.wizSurface.isNPOT = true;
    this.wizImage = new imageClass();
    // _surface, _cellFrame, _anchorX, _anchorY, _tiling, _fullScreen
    this.wizImage.create(this.wizSurface, 0, 0.0, 0.0, false, false);
    this.wiz = new pbSprite();
    // _image, _x, _y, _z, _angleInRadians, _scaleX, _scaleY
    this.wiz.create(this.wizImage, 32, 32, 1.0, 0, 1.0, 1.0);
    this.wiz.move = { x : 1000, y : 1000, cellFrame : 0, dx : 0, dy : 0, speed : 50 };
    this.wiz.light = { x : 0, y : 0, r : 0.0, g : 0.0, b : 8.0, range : 0.25 };

    // create a top layer that doesn't cast shadows
	this.topLayer = new layerClass();
	this.topLayer.create(rootLayer, this.renderer, 0, 0, 1.0, 0, 1.0, 1.0);
	this.topLayer.addChild(this.wiz);

    this.enemy = [];
    for(var e = 0; e < 14; e++)
    {
    	this.enemy[e] = { x : 1000, y : 1000, dx : 0, dy : 0, speed: 10 + Math.floor(Math.random() * 40), r : 0.25 + Math.random() * 0.5, g : 0.25 + Math.random() * 0.5, b : 0.0 };
    	this.moveToRandomEmptyLocation(this.enemy[e]);
    }

    // get the ImageData for the floor
	var imageData = this.loader.getFile( this.floorImg );
	// upload the floor image directly to the correct texture register on the GPU (it's hardwired in pbWebGlFilters to texture number 3)
	this.renderer.graphics.textures.prepare(imageData, false, true, gl.TEXTURE3 );
};


pbDungeonLightDemo.prototype.moveToRandomEmptyLocation = function(_who)
{
	var w = this.tileMap.layers[0].width;
	var h = this.tileMap.layers[0].height;
	var rx, ry;
	do{
		rx = Math.floor(Math.random() * w);
		ry = Math.floor(Math.random() * h);
	}while(this.collide(rx, ry));
	_who.x = rx * 1000;
	_who.y = ry * 1000;
};


pbDungeonLightDemo.prototype.destroy = function()
{
	console.log("pbDungeonLightDemo.destroy");

	if (this.surface)
		this.surface.destroy();
	this.surface = null;

	if (this.renderer)
		this.renderer.destroy();
	this.renderer = null;

	this.rttTexture = null;
	this.rttRenderbuffer = null;
	this.rttFramebuffer = null;

	this.filterTexture = null;
	this.filterFramebuffer = null;
};


pbDungeonLightDemo.prototype.createSurfaces = function()
{
	console.log("pbScrollDemo.createSurfaces");

	// set up the tiles in a pbSprite
	imageData = this.loader.getFile( this.tileImg );
	this.tileSurface = new pbSurface();
	this.tileSurface.create(this.tileMap.tilesets[0].tilewidth, this.tileMap.tilesets[0].tileheight, this.tileMap.tilesets[0].imagewidth / this.tileMap.tilesets[0].tilewidth, this.tileMap.tilesets[0].imageheight / this.tileMap.tilesets[0].tileheight, imageData);
	this.tileSurface.isNPOT = true;

	// create all the scrolling layers to draw from the tileSurface
	this.createLayers(this.tileSurface);
};


pbDungeonLightDemo.prototype.createLayers = function(_surface)
{
	// create the scrolling layers
	this.tileLayers = [];
	this.addLayer(_surface);
};


pbDungeonLightDemo.prototype.addLayer = function(_surface)
{
	var layer = new layerClass();
	layer.create(rootLayer, this.renderer, 0, 0, 1, 0, 1, 1);
	rootLayer.addChild(layer);

	var i = this.tileLayers.length;
	// draw map tiles into the new layer
	this.drawMap(layer);
	this.tileLayers.push(layer);
};


pbDungeonLightDemo.prototype.drawMap = function(_layer)
{
	// pre-calc pixel dimensions of map
	this.mapWidth = this.tileMap.layers[0].width * this.tileMap.tilesets[0].tilewidth;
	this.mapHeight = this.tileMap.layers[0].height * this.tileMap.tilesets[0].tileheight;

	this.mapSprites = [];
	for(var y = 0; y < this.tileMap.layers[0].height; y++)
	{
		this.mapSprites[y] = [];
		for(var x = 0; x < this.tileMap.layers[0].width; x++)
		{
			var tile = this.tileMap.layers[0].data[x + y * this.tileMap.layers[0].width];

			// 0 tile number is empty space, all other tile numbers are +1 their actual index position in the tile texture
			if (tile !== 0)
			{
				var s = this.createTile(x * this.tileMap.tilesets[0].tilewidth, y * this.tileMap.tilesets[0].tileheight, tile - 1);
				_layer.addChild(s);
				this.mapSprites[y][x] = s;
			}
		}
	}
};


pbDungeonLightDemo.prototype.createTile = function(_x, _y, _cell)
{
	var img = new imageClass();
	img.create(this.tileSurface, _cell, 0, 0, false, false);
	var spr = new pbSprite();
	spr.create(img, _x, _y, 0.5, 0, 1, 1);
	return spr;
};


pbDungeonLightDemo.prototype.restart = function()
{
	console.log("pbDungeonLightDemo.restart");
	
	this.destroy();
	this.create();
};


pbDungeonLightDemo.prototype.addSprites = function()
{
	console.log("pbDungeonLightDemo.addSprites");

};


pbDungeonLightDemo.prototype.collide = function(_x, _y)
{
	var tile = this.tileMap.layers[0].data[_x + _y * this.tileMap.layers[0].width];
	return (tile !== 0);
};


pbDungeonLightDemo.prototype.dirChoose = function(_who, _dir)
{
	if (_who.x % 1000 !== 0 || _who.y % 1000 !== 0)
		return;

	var wx = _who.x / 1000;
	var wy = _who.y / 1000;
	do {
		// pick a direction at random (0 = right, 1 = left, 2 = down, 3 = up)
		var d = Math.floor(Math.random() * 4);
		// decrease chance of reversing direction
		if (_dir !== undefined)
		{
			var reverse = [ 1, 0, 3, 2 ];
			if (d === reverse[_dir])
				d = Math.floor(Math.random() * 4);
			if (d === reverse[_dir])
				d = Math.floor(Math.random() * 4);
			if (d === reverse[_dir])
				d = Math.floor(Math.random() * 4);
		}
		switch(d)
		{
			case 0:
				if (!this.collide(wx + 1, wy))
				{
					_who.dx = _who.speed;
					_who.dy = 0;
					return;
				}
				break;
			case 1:
				if (!this.collide(wx - 1, wy))
				{
					_who.dx = -_who.speed;
					_who.dy = 0;
					return;
				}
				break;
			case 2:
				if (!this.collide(wx, wy + 1))
				{
					_who.dx = 0;
					_who.dy = _who.speed;
					return;
				}
				break;
			case 3:
				if (!this.collide(wx, wy - 1))
				{
					_who.dx = 0;
					_who.dy = -_who.speed;
					return;
				}
				break;
		}
	} while(true);
};


function fract(_value)
{
	return _value % 1000;
}


pbDungeonLightDemo.prototype.wizWalk = function()
{
	var wx = Math.floor(this.wiz.move.x / 1000);
	var wy = Math.floor(this.wiz.move.y / 1000);

	// sometimes we just turn
	if (Math.random() < 0.1)
		this.dirChoose(this.wiz.move);

	if (this.wiz.move.dx > 0)
	{
		if (this.wiz.move.dx >= 1000 - fract(this.wiz.move.x) && this.collide(wx + 2, wy))
		{
			this.wiz.move.x = (wx + 1) * 1000;
			this.dirChoose(this.wiz.move, 0);
		}
	}
	if (this.wiz.move.dx < 0)
	{
		if (this.wiz.move.dx < -fract(this.wiz.move.x) && this.collide(wx - 1, wy))
		{
			this.wiz.move.x -= this.wiz.move.x % 1000;
			this.dirChoose(this.wiz.move, 1);
		}
	}
	if (this.wiz.move.dy > 0)
	{
		if (this.wiz.move.dy >= 1000 - fract(this.wiz.move.y) && this.collide(wx, wy + 2))
		{
			this.wiz.move.y = (wy + 1) * 1000;
			this.dirChoose(this.wiz.move, 2);
		}
	}
	if (this.wiz.move.dy < 0)
	{
		if (this.wiz.move.dy < -fract(this.wiz.move.y) && this.collide(wx, wy - 1))
		{
			this.wiz.move.y -= this.wiz.move.y % 1000;
			this.dirChoose(this.wiz.move, 3);
		}
	}

	this.wiz.move.x += this.wiz.move.dx;
	this.wiz.move.y += this.wiz.move.dy;

	// update wizard sprite
	this.wiz.x = (this.wiz.move.x / 1000) * this.tileMap.tilesets[0].tilewidth;
	this.wiz.y = (this.wiz.move.y / 1000) * this.tileMap.tilesets[0].tileheight;

	this.wiz.move.cellFrame += 1;
	if (this.wiz.move.cellFrame >= 30)
		this.wiz.move.cellFrame = 0;
	if (this.wiz.move.dx > 0)
		this.wiz.image.cellFrame = this.wiz.move.cellFrame + 90;
	else if (this.wiz.move.dx < 0)
		this.wiz.image.cellFrame = this.wiz.move.cellFrame + 30;
	else if (this.wiz.move.dy > 0)
		this.wiz.image.cellFrame = this.wiz.move.cellFrame + 0;
	else if (this.wiz.move.dy < 0)
		this.wiz.image.cellFrame = this.wiz.move.cellFrame + 60;
};


pbDungeonLightDemo.prototype.enemyWalk = function()
{
	for(var e = 0, l = this.enemy.length; e < l; e++)
	{
		var wx = Math.floor(this.enemy[e].x / 1000);
		var wy = Math.floor(this.enemy[e].y / 1000);

		// sometimes we just turn
		if (Math.random() < 0.1)
			this.dirChoose(this.enemy[e]);

		if (this.enemy[e].dx > 0)
		{
			if (this.enemy[e].dx >= 1000 - fract(this.enemy[e].x) && this.collide(wx + 2, wy))
			{
				this.enemy[e].x = (wx + 1) * 1000;
				this.dirChoose(this.enemy[e], 0);
			}
		}
		if (this.enemy[e].dx < 0)
		{
			if (this.enemy[e].dx < -fract(this.enemy[e].x) && this.collide(wx - 1, wy))
			{
				this.enemy[e].x -= this.enemy[e].x % 1000;
				this.dirChoose(this.enemy[e], 1);
			}
		}
		if (this.enemy[e].dy > 0)
		{
			if (this.enemy[e].dy >= 1000 - fract(this.enemy[e].y) && this.collide(wx, wy + 2))
			{
				this.enemy[e].y = (wy + 1) * 1000;
				this.dirChoose(this.enemy[e], 2);
			}
		}
		if (this.enemy[e].dy < 0)
		{
			if (this.enemy[e].dy < -fract(this.enemy[e].y) && this.collide(wx, wy - 1))
			{
				this.enemy[e].y -= this.enemy[e].y % 1000;
				this.dirChoose(this.enemy[e], 3);
			}
		}

		this.enemy[e].x += this.enemy[e].dx;
		this.enemy[e].y += this.enemy[e].dy;
	}
};


pbDungeonLightDemo.prototype.update = function()
{
	this.wizWalk();
	this.enemyWalk();
};


/**
 * postUpdate - apply the filter to the rttTexture, then draw the results on screen
 *
 */
pbDungeonLightDemo.prototype.postUpdate = function()
{
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);

	// copy the rttTexture to the filterFramebuffer attached texture, applying a filter as it draws
	gl.activeTexture(gl.TEXTURE1);
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.filterFramebuffer);
	this.renderer.graphics.applyFilterToTexture(1, this.rttTexture, this.setFilter, this);

	// update transforms and draw sprites that are not shadow casters
	this.topLayer.update();

	// draw the filter texture to the display
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.activeTexture(gl.TEXTURE2);
	this.renderer.graphics.drawTextureToDisplay(2, this.filterTexture);
};


var lightData = [
// x, y, power/color, range
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
0.0, 0.0, 0.0, 0.0,
];


// pack bytes _r, _g and _b into a single float with four precision bits each
function pack(_r, _g, _b)
{
	return (Math.floor(_r * 16.0) + Math.floor(_g * 16.0) * 256.0 + Math.floor(_b * 16.0) * 256.0 * 256.0);
}


pbDungeonLightDemo.prototype.setLightData = function()
{
	// first light is attached to the player ship
	var w = this.tileMap.tilesets[0].tilewidth;
	var h = this.tileMap.tilesets[0].tileheight;
	lightData[0 * 4 + 0] = (this.wiz.move.x / 1000 * w + w * 0.5 + this.wiz.light.x) / pbRenderer.width;
	lightData[0 * 4 + 1] = 1.0 - (this.wiz.move.y / 1000 * h + h * 0.5 + this.wiz.light.y) / pbRenderer.height;
	lightData[0 * 4 + 2] = pack(this.wiz.light.r, this.wiz.light.g, this.wiz.light.b);
	lightData[0 * 4 + 3] = this.wiz.light.range;

	var i = 1;
	for(var e = 0, l = this.enemy.length; e < l; e++)
	{
		lightData[i * 4 + 0] = (this.enemy[e].x / 1000 * w + w * 0.5) / pbRenderer.width;
		lightData[i * 4 + 1] = 1.0 - (this.enemy[e].y / 1000 * h + h * 0.5) / pbRenderer.height;
		lightData[i * 4 + 2] = pack(this.enemy[e].r, this.enemy[e].g, this.enemy[e].b);
		lightData[i * 4 + 3] = 0.25;
		if (++i >= 16) break;
	}
	for(; i < 16; i++)
	{
	 	// a light with power/colour of zero is switched off
	 	lightData[i] = 0.0;
	}
};


// callback required to set the correct filter program and it's associated attributes and/or uniforms
pbDungeonLightDemo.prototype.setFilter = function(_filters, _textureNumber)
{
   	// set the filter program
	_filters.setProgram(_filters.multiLightShaderProgram, _textureNumber);

	// set the secondary source texture for the filter - this draws the floors using the ImageData in register 3
	gl.uniform1i( pbWebGlShaders.currentProgram.samplerUniforms.uFloorSampler, 3 );

	// set the parameters for the filter shader program
	this.setLightData();

	// send them to the shader
	gl.uniform4fv( pbWebGlShaders.currentProgram.uniforms.uLights, lightData );
};