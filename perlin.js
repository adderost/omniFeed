(function(){
	"use strict";
	let perlinArt = function(){

		this.setup = function(container, scale, ticktime=1000, style = ['#000', '#fff']){
			let self = this;
			//Save variables
			self.onScreenContainer = container;
			self.pixelScale = scale;
			if(style.length>0) self.style = style;
			self.ticktime = ticktime;
			//Create canvases and contexts
			self.onScreenCanvas = document.createElement('canvas');
			self.visibleCtx = self.onScreenCanvas.getContext("2d");
			self.offScreenBuffer = document.createElement('canvas');
			self.bufferCtx = self.offScreenBuffer.getContext("2d");
			self.offScreenOriginal = document.createElement('canvas');
			self.originalCtx = self.offScreenOriginal.getContext("2d");

			//Attach the visible canvas to the container
			self.onScreenContainer.appendChild(self.onScreenCanvas);

			//Make sure everything has the correct size. And keeps the correct size
			self.resizeCanvases();
			window.addEventListener('resize', function(){self.resizeCanvases();}, true);

			return(self);
		};

		this.start = function(){
			let self = this;
			if(self.ticktime > 0) self.ticker = window.setInterval(self.paintCanvas.bind(self), self.ticktime);
		};

		this.stop = function(){
			let self = this;
			window.clearInterval(self.ticker);
		};

		this.setColors = function(style){
			let self = this;
			if(style.length>0) self.style = style;
		}


		this.perlin = function(width, height){

			this.getPixel = function(x, y){
				let self = this;
				// Compute Perlin noise at coordinates x, y
				// Determine grid cell coordinates
				let x0 = x;
				let x1 = x0 + 1;
				let y0 = y;
				let y1 = y0 + 1;

				// Determine interpolation weights
				// Could also use higher order polynomial/s-curve here
				let sx = x - x0;
				let sy = y - y0+1;

				// Interpolate between grid point gradients
				let n0, n1, ix0, ix1, value;
				n0 = self.dotGridGradient(x0, y0, x, y);
				n1 = self.dotGridGradient(x1, y0, x, y);
				ix0 = self.lerp(n0, n1, sx);
				n0 = self.dotGridGradient(x0, y1, x, y);
				n1 = self.dotGridGradient(x1, y1, x, y);
				ix1 = self.lerp(n0, n1, sx);
				value = self.lerp(ix0, ix1, sy);

				if(value < 0) value = -value;

				self.gradient[x][y] = [Math.random()*value, Math.random()*value];
				if(self.gradient[x][y][0] < 0.001) self.gradient[x][y][0] = Math.random();
				if(self.gradient[x][y][1] < 0.001) self.gradient[x][y][1] = Math.random();

				return( ( value ) );
			};

			// Function to linearly interpolate between a0 and a1
			// Weight w should be in the range [0.0, 1.0]
			this.lerp = function(a0, a1, w) {
				return(a0 + w*(a1 - a0));
			};

			// Computes the dot product of the distance and gradient vectors.
			this.dotGridGradient = function(ix, iy, x, y) {
				let self = this;
				// Precomputed (or otherwise) gradient vectors at each grid node
				let gradient = self.gradient;

				// Compute the distance vector
				let dx = x - ix;
				let dy = y - iy;

				// Compute the dot-product
				try{
					return (dx*gradient[ix][iy][0] + dy*gradient[ix][iy][1]);
				}catch(error){
					console.error(error);
					return(0);
				}
			};

			//Generates a 2d array with random float vectors
			this.generateGradientMap = function(width, height){
				let arr = Array.apply(null, Array(width+2)).map(function (x, i) {
					return(Array.apply(null, new Array(height+2)).map(function(){
						return([Math.random(), Math.random()]);
					}));
				});
				return(arr);
			};

			this.init = function(width, height){
				let self = this;
				self.gradient = self.generateGradientMap(width, height);
			};

			this.init(width, height);
		};
		

		this.paintOriginal = function(){
			//Keep track of ourselves
			let self = this;

			//Keep track of stuff
			let ctx = self.originalCtx;
			let width = self.offScreenOriginal.width;
			let height = self.offScreenOriginal.height;
			let imageData = self.originalCtx.getImageData(0, 0, width, height);

			for (let i = 0; i < (imageData.data.length/4); i++ ){
				let pointer = (i*4);
				let X = (i%width);
				let Y = height-(Math.ceil(i/width));
				let value = Math.floor(self.perlinNoise.getPixel(X,Y) * self.style.length);
				let color = self.hexToRgb(self.style[value]);

				imageData.data[pointer] = color.r;
				imageData.data[pointer+1] = color.g;
				imageData.data[pointer+2] = color.b;
				imageData.data[pointer+3] = 255;
			}

			ctx.putImageData(imageData,0,0);
		};

		this.scaleToBuffer = function(){
			//Keep track of ourselves
			let self = this;
			//Set variables
			let ctx = self.bufferCtx;
			let width = self.offScreenOriginal.width;
			let height = self.offScreenOriginal.height;
			let pixelScale = self.pixelScale;
			let imageData = self.originalCtx.getImageData(0,0,self.offScreenOriginal.width, self.offScreenOriginal.height);

			let newImageData = ctx.createImageData(width*pixelScale, height*pixelScale);

			//Create scaled pixels on the offscren buffer for all pixels on the original
			for (let i = 0; i < (imageData.data.length/4); i++ ){
				let j = (i*4);
				for(let pixelIterator = 0; pixelIterator<pixelScale; pixelIterator++){
					//First multiply position with pixelScale
					//Then add pixelscale for each row
					//And then work with where we are in X-axis
					let pointer = (j*pixelScale); 
						pointer += ((Math.floor(i/width)) * (width * (4 * pixelScale)) *(pixelScale-1) );	
						pointer += pixelIterator*4;	
						
					for(let innerIterator = 0; innerIterator<pixelScale; innerIterator++){
						let innerPointer = pointer+innerIterator*width*4*pixelScale; 		//And then we work with the Y-axis

						newImageData.data[innerPointer] = imageData.data[j];				//RED
						newImageData.data[innerPointer+1] = imageData.data[j+1];			//GREEN
						newImageData.data[innerPointer+2] = imageData.data[j+2];			//BLUE
						newImageData.data[innerPointer+3] = 255;							//ALPHA
					}
				}
			}
			ctx.putImageData(newImageData,0,0);
		};

		this.copyBufferToVisible = function(){
			//Keep track of ourselves
			let self = this;
			//Just copy the finished content from the offscreen buffer and put it over whatever is visible
			self.visibleCtx.drawImage(self.offScreenBuffer, 0, 0);
		};


		this.resizeCanvases = function(){
			//Keep track of ourselves
			let self = this;

			//Set onscreen canvas to fill container. 1px is 1px
			self.onScreenCanvas.width = self.onScreenContainer.clientWidth;
			self.onScreenCanvas.height = self.onScreenContainer.clientHeight;

			//Set the offscreen buffer to be exactly the same as the onscreen canvas. We're just going to copy the content between the buffer and the visible canvas
			self.offScreenBuffer.width = self.onScreenCanvas.width;
			self.offScreenBuffer.height = self.onScreenCanvas.height;

			//Set the offscreen scaled original to the pixelScale fraction of the visible canvas.
			self.offScreenOriginal.width = Math.ceil(self.offScreenBuffer.width/self.pixelScale);
			self.offScreenOriginal.height = Math.ceil(self.offScreenBuffer.height/self.pixelScale);

			//Initialize Perlin Noise
			self.perlinNoise = new self.perlin(self.offScreenOriginal.width, self.offScreenOriginal.height);

			window.requestAnimationFrame(self.paintCanvas.bind(self));
		};	

		this.paintCanvas = function(){
			//Keep track of ourselves
			let self = this;

			//First: draw on downscaled canvas
			self.paintOriginal();
			//Second: scale original to offscreen buffer
			self.scaleToBuffer();
			//Last: copy buffer to visible canvas
			self.copyBufferToVisible();
		};

		this.hexToRgb = function(hex) {
			// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
			let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
			hex = hex.replace(shorthandRegex, function(m, r, g, b) {
				return r + r + g + g + b + b;
			});

			let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
			return result ? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			} : null;
		};
	};	//End of perlinArt object

	window.perlinArt = function(container, scale, ticktime = null, customStyle = null){
		var pa = new perlinArt();
		return(pa.setup(container, scale, ticktime, customStyle));
	};

})();