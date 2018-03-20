window.onload = function(){
	"use strict";

	var feedHandler ={

		//This functions sets up needed variables for the feed
		setup: function(container){			
			var self = this;				//This is ourselves
			self.container = container;		//Get the container
			self.self = this;				//Save a reference to ourselves			

			//Get the article-template and set variables
			self.articleTemplate 		= self.self.container.getElementsByTagName("article").item(0); 
			self.transitionTime 		=  window.getComputedStyle(self.articleTemplate).getPropertyValue("transition-duration");
			self.transitionTime 		=  Math.max(((self.transitionTime.indexOf( "ms" ) >- 1 ) ? parseFloat( self.transitionTime ) : parseFloat( self.transitionTime ) * 1000), 200);
			self.imageWidth 			= parseFloat(window.getComputedStyle(self.articleTemplate.getElementsByTagName("img").item(0)).getPropertyValue("width"));
			self.minimumMargin 			= parseFloat(window.getComputedStyle(self.articleTemplate).getPropertyValue("margin-bottom"));
			self.numberOfArticlesToShow	= 1;
			self.articles 				= Array();
			self.deadArticles 			= Array();

			self.articleTemplate.style.position = "absolute";
			self.articleTemplate.style.opacity = 0;

			//Lastly, remove the template from DOM and start fetching content asynchronously
			self.container.removeChild(self.articleTemplate);

			//This starts the main loop of Fetch->Parse->Remove->Position->Add
			window.setTimeout(function(){self.fetchArticles();}, 0);
		},

		//Fetch articles from server and send the result to parser
		fetchArticles: function(){
			var self = this;
			if(!self.XHR){
				self.XHR = new XMLHttpRequest();
				self.XHR.addEventListener( "load", function(){self.parseFeed(this.response);});
			}
			self.XHR.open( "GET", "feed.php?imgWidth="+(self.imageWidth*2)+"&limit=" + self.numberOfArticlesToShow );
			self.XHR.send();
		},

		//Parses the feed, tries to update every article that already exists, and adds the ones that don't
		parseFeed: function(response){
			var self = this;
			var feed = JSON.parse(response);
			feed.forEach(function(element){
				var exists = false;
				self.articles.forEach(function(article){
					if(article.updateContent(element)){ exists = true; }
				});
				if(!exists){ self.addArticle(element); }
			});

			//The rest of the cycle
			window.setTimeout(function(){self.removeArticles(feed);}, self.transitionTime);
			window.setTimeout(function(){self.positionArticles();}, self.transitionTime*2);
			window.setTimeout(function(){self.showArticles();}, self.transitionTime*3);
			window.setTimeout(function(){self.fetchArticles();}, self.transitionTime*8);
		},

		removeArticles: function(feed){
			var self = this;
			var articlesToPurge = Array();
			self.articles.forEach(function(article, index){
				if(article.removed){
					articlesToPurge.push(index);
				}

				var found = false;
				feed.forEach(function(feedArticle){
					if(article.id == feedArticle.id){found = true}
				});
				if(!found){
					article.remove();
				}
			});

			articlesToPurge.reverse().forEach(function(index){
				self.deadArticles.push(self.articles.splice(index, 1)[0]);
			});

		},

		//Positions the articles in the container
		positionArticles: function(){
			var self = this;
			var containerHeight = self.container.clientHeight;
			var visibleArticles = 0;
			var aggregatedHeight = 0;
			var optimalMargin = 0;

			//Sort articles, then check how much space they need
			self.articles.sort(function(a,b){return(Date.parse(b.published) - Date.parse(a.published));});
			self.articles.forEach(function(article){
				if(!article.removed){
					if( ( (aggregatedHeight + article.height) + (self.minimumMargin * (visibleArticles+1) ) ) < containerHeight){
						aggregatedHeight += article.height;
						visibleArticles++;
					}
					else{
						article.hide();
					}
				}
			});

			self.numberOfArticlesToShow = visibleArticles+1;
			optimalMargin = Math.round( (containerHeight - aggregatedHeight) / (visibleArticles + 1) );
			//Then we calculate margin and position objects
			aggregatedHeight = optimalMargin;
			for(var i = 0; i<self.articles.length; i++){
				if(!self.articles[i].removed){
					self.articles[i].moveTo(aggregatedHeight);
					aggregatedHeight += self.articles[i].height + optimalMargin;
				}
			}
			//Next step is showing stuff
		},

		showArticles: function(){
			var self = this;
			var containerHeight = self.container.clientHeight;
			self.articles.forEach(function(article){
				if(!article.removed){
					if( (article.position + article.height) < containerHeight ){
						article.show();
					}
					else{
						article.hide();
					}
				}
			});
		},

		//Creates a new article based on feed data and adds it to the DOM. If we have dead articles, reuse memory;
		addArticle: function(data){
			var self = this;

			//Setup articleObject, either with existing object or create a new
			var newArticle = null;
			if(self.deadArticles.length){
				newArticle = self.deadArticles.shift();
				if(!newArticle.updateContent(data)){
					newArticle.getContentFromData(data, newArticle);
					console.log("Reusing articleObject");
				}
			}
			else{ newArticle = new articleObject(data, self.articleTemplate.cloneNode(true)); }

			//Then add the articleObject to active articles and DOM
			self.articles.push(newArticle);
			self.container.appendChild(newArticle.DOM);
		}

		
	};

	//This object holds everything needed to show an article
	function articleObject(data, template){
		var self = this;
		self.DOM = template;

		function init(self){
			self.height = 0;
			self.position = 0;
			self.hidden = false;
			self.removed = false;
			self.inited = false;
			self.hide();
		}

		self.updateContent = function (data){
			var self = this;

			if(self.id == data.id){
				self.getContentFromData(data, self);
				self.height = self.DOM.offsetHeight;
				return(true);
			}
			else{
				return(false);
			}
		};

		self.getContentFromData = function(data, self){
			self.id = data.id;
			self.published = data.published;
			self.author = data.authors;
			self.title = data.title;
			self.image = data.image;
			self.text = data.text;

			updateDOM(self);
		}

		function updateDOM(self){
			var settings = [
				{src: "title", trg: "h1", fnc: null},
				{src: "published", trg: "time", fnc: function(time){return(time);}},
				{src: "text", trg: "div", fnc: null},
				{src: "author", trg: "span", fnc: null}
			];

			settings.forEach(function(setting){
				if(self[setting.src]){
					var element = self.DOM.getElementsByTagName(setting.trg);
					if(element.length>0){
						if(!setting.fnc) { element.item(0).innerHTML = self[setting.src]; }
						else { element.item(0).innerHTML = setting.fnc(self[setting.src]); }
					}
				}
			});
		}

		this.moveTo = function(position){
			var self = this;
			self.DOM.style.top=position+"px";
		};

		this.remove = function(){
			var self = this;
			self.hide();
			self.removed=true;
		};

		this.hide = function(){
			var self = this;
			self.hidden = true;
			self.DOM.style.opacity=0;
		};

		this.show = function(){
			var self = this;
			if(!self.removed){
				if(self.inited){
					self.hidden = false;
					self.DOM.style.opacity=1;
				}
				else{
					self.inited = true;
				}
			}
		};

		//Init default variables and get content
		init(self);
		self.getContentFromData(data, self);
	}

	feedHandler.setup(document.getElementById("omnifeed"));
};