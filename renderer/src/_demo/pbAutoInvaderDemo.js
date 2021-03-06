/**
 *
 * The auto-invaders demo for the new Phaser 3 renderer.
 *
 * Also illustrates layer clipping.
 * 
 *
 */


/* jshint laxbreak: true */	// tell jshint to just shut-up already about my choice of line format



// created while the data is loading (preloader)
function pbAutoInvaderDemo( docId )
{
	console.log( "pbAutoInvaderDemo c'tor entry" );

	var _this = this;

	this.docId = docId;

	this.layer = null;
	this.game = null;

	// create loader with callback when all items have finished loading
	this.loader = new pbLoader( this.allLoaded, this );

	this.loader.loadImage( "player", "../img/invader/player.png" );
	this.loader.loadImage( "invader", "../img/invader/invader32x32x4.png", 32, 32, 4, 1);
	this.loader.loadImage( "stars", "../img/invader/starfield.png" );
	this.loader.loadImage( "bullet", "../img/invader/bullet.png" );
	this.loader.loadImage( "bomb", "../img/invader/enemy-bullet.png" );
	this.loader.loadImage( "rocket", "../img/invader/rockets32x32x8.png", 32, 32, 8, 1 );
	this.loader.loadImage( "smoke", "../img/invader/smoke64x64x8.png", 64, 64, 8, 1 );
	this.loader.loadImage( "explosion", "../img/invader/explode.png", 128, 128, 16, 1 );
	this.loader.loadImage( "font", "../img/fonts/arcadeFonts/16x16/Bubble Memories (Taito).png", 16, 16, 95, 7 );

	console.log( "pbAutoInvaderDemo c'tor exit" );
}


pbAutoInvaderDemo.prototype.allLoaded = function()
{
	console.log( "pbAutoInvaderDemo.allLoaded" );

	// callback to this.create when ready, callback to this.update once every frame
	this.renderer = new pbRenderer( useRenderer, this.docId, this.create, this.update, this );
};


pbAutoInvaderDemo.prototype.create = function()
{
	console.log("pbAutoInvaderDemo.create");

	this.layer = new layerClass();
	// _parent, _renderer, _x, _y, _z, _angleInRadians, _scaleX, _scaleY
	this.layer.create(rootLayer, this.renderer, 0, 0, 1, 0, 1, 1);
	// illustrate layer clipping by chopping 20 pixels off each edge
	this.layer.setClipping( 20, 20, pbRenderer.width - 40, pbRenderer.height - 40 );
	rootLayer.addChild(this.layer);
	this.game = new pbInvaderDemoCore();
	this.game.create(this, this.layer);
};


pbAutoInvaderDemo.prototype.destroy = function()
{
	console.log("pbAutoInvaderDemo.destroy");

	this.layer.destroy();
	this.layer = null;

	this.renderer.destroy();
	this.renderer = null;

	this.game.destroy();
	this.game = null;
};


pbAutoInvaderDemo.prototype.update = function()
{
	this.game.update();
};
