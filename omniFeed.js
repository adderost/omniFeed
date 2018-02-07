window.onload = function(){

	//Object to keep track of the container and updates
	function feedContainer(container){
		this.self = this;
		this.container = container;
		this.articleTemplate;
		this.height = 0;
		this.imageWidth=0;
		this.transitionTime = 0;
		this.margin = 0;
		this.articles = Array();
		this.numberOfArticlesToShow = 1;
		this.firstTime=true;

		this.setupContainerAndTemplate = function(){
			/*Get the template from dom */
			var articleTemplate = this.self.container.getElementsByTagName('article').item(0); 
			
			/*Set variables from template*/
			var duration = window.getComputedStyle(articleTemplate).getPropertyValue('transition-duration');
			this.self.transitionTime = Math.max(((duration.indexOf( 'ms' ) >- 1 ) ? parseFloat( duration ) : parseFloat( duration ) * 1000), 200);
			this.self.imageWidth = parseFloat(window.getComputedStyle(articleTemplate.getElementsByTagName('img').item(0)).getPropertyValue("width"));
			this.self.margin = parseFloat(window.getComputedStyle(articleTemplate).getPropertyValue('margin-bottom'))
	
			/*Remove content and set styling on template and container*/
			this.self.container.style.position="relative";
			articleTemplate.style.opacity = 0;
			articleTemplate.style.position = "absolute";

			var templateChildren = articleTemplate.children;
			for(var i=0;i<templateChildren.length;i++){
				templateChildren[i].innerHTML="";
			}
			
			/*Remove the template from DOM but keep in memory */
			this.self.container.removeChild(articleTemplate);
			this.self.articleTemplate = articleTemplate;

			//Now start fetching content
			var that = this;
			window.setTimeout(function(){that.fetchArticles();}, 0);
		}

		this.addArticle = function(data){	//Creates a new article object with fetched content. Adds it to the list and enqueues it for display
			//First create the object with a copy of our template. Then push it to the display stack
			var newArticle = new article(data, this.self.articleTemplate.cloneNode(true));
			this.articles.push(newArticle);

			//Now sort the list, sometimes we get articles out of order
			this.articles.sort(function(a,b){
				return(Date.parse(b.published) - Date.parse(a.published));
			});

			//Lastly, we add the created object to the DOM so that it can be displayed
			this.container.appendChild(newArticle.template);
		}

		this.updateArticles = function(feed){ //Iterate through the newly fetched feed and update content on existing articles, or add new article if it's not already there.
			for(i=0;i<feed.length;i++){
				var exists = false;
				for(j=0; j<this.articles.length; j++){
					if(this.articles[j].updateContent(feed[i])){
						exists = true;
						break;
					}
				}
				if(!exists){
					this.addArticle(feed[i]);
				}
			}

			//After all this we remove the ones we don't use anymore. Memory management and so on
			this.removeDeleted(feed);
		}

		this.removeDeleted = function(feed){	//Checks for articles in display queue that are not in the feed. If they're removed from the feed they're marked for removal in queue too.
			for(var i=0; i<this.articles.length; i++){
				var found = false;
				for (var j=0; j<feed.length;j++){
					if(this.articles[i].id == feed[j]['id']) found=true;
				}
				if(!found){	//First mark for removal, next cycle actually remove it. This is to allow object to gracefully animate
					if(this.articles[i].removed) {
						this.container.removeChild(this.articles[i].template);
						this.articles[i] = false;
					}
					else{
						this.articles[i].remove();
					}
				}
			}

			//Timeout is set to let animation finish before doing next part of the cycle.
			//After deletion of articles we should move and sort the ones that are left
			var that = this;
			setTimeout(function(){that.sortAndMoveArticles()}, this.transitionTime);
		}

		this.sortAndMoveArticles = function(){	//Sorts the articles in the queue according to update-time. Then tells them to update their position, this will probably animate.
			this.self.height = this.self.container.clientHeight //Setup height of feed

			//Move all articles to new array, remove deleted ones.
			var cleanArticles = Array();
			for(var i=0; i<this.articles.length;i++){
				if(this.articles[i]) cleanArticles.push(this.articles[i]);
			}

			//Sort the new list
			cleanArticles.sort(function(a,b){
				return(Date.parse(b.published) - Date.parse(a.published));
			});

			//Move the articles to their correct Y-position. It should be the height of all previous articles plus the margin between them.
			var aggregatedPixels = 0;
			for(var i=0;i<cleanArticles.length;i++){
				position = aggregatedPixels + (i*this.margin);
				aggregatedPixels += cleanArticles[i].height;
				cleanArticles[i].moveTo(position);

				//If we're putting articles outside of the container, just hide them. (Animated)
				if(aggregatedPixels >= this.height) cleanArticles[i].hide();
			}

			//Set the queue to our new orderded and filtered list.
			this.articles = cleanArticles;

			//Once again we wait until animations are finished. Then we check which ones should appear.
			var that = this;
			setTimeout(function(){that.showArticles()}, this.transitionTime);
		}

		this.showArticles = function(){ //Checks all articles to see wich ones that are hidden that should actually be shown. Every other article will have moved to it's correct place so we can just fade them in now.
			if(!this.firstTime){	//We wait until cycle 2 so that we actually know the heights of articles...
				for(i = 0; i<this.articles.length ;i++){
					if( ( this.articles[i].yPos+this.articles[i].height) < this.self.height ){	//If the whole article fits in the container, show it!
						this.articles[i].show();	
					} 
					else this.articles[i].hide();	//Otherwise hide it!
					if( this.articles[i].yPos > this.self.height ){ //If an article is completely positioned outside of the container, we stop checking and make sure that we're not fetching more articles than needed.
						this.numberOfArticlesToShow=i 
						break;
					}
				}
				if(this.articles[this.articles.length-1].yPos + this.articles[this.articles.length-1].height < this.self.height) this.numberOfArticlesToShow += 1; //If we have room for more articles... possibly... we increment how many we fetch
			}
			else this.firstTime = false;

			//Now we're waiting until animations finish and then some more. Before we fetch the feed again and start a new cycle.
			var that = this;
			window.setTimeout(function(){that.fetchArticles();}, (this.transitionTime*2));
		}

		this.customAjax = function(url, callback = function(){}){	//Send getrequest and call the callback on success. Just standard XHR-request
			var newXHR = new XMLHttpRequest();
			newXHR.addEventListener( 'load', callback );
			newXHR.open( 'GET', url );
			newXHR.send();
		}

		this.fetchArticles = function(){	//Fetch the feed, with some queryvars that tailors the feed to our needs.
			var that = this;
			this.customAjax("feed.php?imgWidth="+(this.imageWidth*2)+"&limit="+this.numberOfArticlesToShow, function(){that.updateArticles(JSON.parse(this.response))})
		}

		//This is run first, when the container object is created. Automagically!
		this.setupContainerAndTemplate();
	}

	//Object to keep track of a single article
	function article(data, template, container){
		this.self = this;							//Who am i?
		this.id = data['id'];						//The ID of the article from the feed
		this.published = data['published'];			//When was it published, not really used
		this.template = template;					//The template to put all our content in
		this.height = 0;							//How tall are we, or the article... yeah. For positioning. Will update when content change
		this.yPos = 0;								//Where are we placed?
		this.hidden = false;						//Are we hidden right now? Not really used... but I like knowing stuff
		this.removed = false;						//Are we removed/deleted? If so we might be purged soon... removed from existance...
		this.firstTime = true;						//To check if we were just created. To allow for the DOM to actually calculate our sizes and stuff.

		this.getContentFromData = function(data){	//Gets data from the feed and then tries to put it in the template.
			this.self.updated = data['updated'];
			this.self.author = data['authors'];
			this.self.title = data['title'];
			this.self.image = data['image'];
			this.self.text = data['text'];
			this.updateTemplate();
		}

		this.updateContent = function(data){		//When we already exist but got some new data from the feed, check if we need to update and then perhaps actually use that data.
			this.self.height = this.self.template.offsetHeight;
			if(data.id == this.self.id){
				if(data.updated > this.self.updated){
					this.getContentFromData(data);
					devlog("Updated article \""+this.self.title+"\"");
				}
				return(true);
			}
			else return(false);
		}

		this.updateTemplate = function(){			//Puts available content in available elements in the template. Lots of checks, not that much content.
			if(this.self.template.getElementsByTagName('img').length > 0){
				if(this.self.image){
					this.self.template.getElementsByTagName('img').item(0).style.backgroundImage = "url("+this.self.image.url+")";
					this.self.template.getElementsByTagName('img').item(0).style.display = "block";
				}
				else this.self.template.getElementsByTagName('img').item(0).style.display = "none";
			}
			
			if(this.self.title) {
				if(this.self.template.getElementsByTagName('h1').length >0 ) this.self.template.getElementsByTagName('h1').item(0).innerHTML = this.self.title;
			}

			if(this.self.published) {
				if(this.self.template.getElementsByTagName('time').length > 0) this.self.template.getElementsByTagName('time').item(0).innerHTML = this.formatTime(new Date(Date.parse(this.self.published)));
			}
			
			if(this.self.text) {
				if(this.self.template.getElementsByTagName('div').length > 0) this.self.template.getElementsByTagName('div').item(0).innerHTML = this.self.text;
			}
			
			if(this.self.author) {
				if(this.self.template.getElementsByTagName('span').length > 0) this.self.template.getElementsByTagName('span').item(0).innerHTML = this.self.author;
			}
		}

		this.formatTime = function(time){	//I just want to format the time.. and had to add a leading-zeroes-function, into the function! Functionception?
			Number.prototype.pad = function(size) {
			  var s = String(this);
			  while (s.length < (size || 2)) {s = "0" + s;}
			  return s;
			}
			return (time.getFullYear()+"-"+time.getMonth().pad(2)+"-"+time.getDate().pad(2)+" "+time.getHours().pad(2)+":"+time.getMinutes().pad(2)+":"+time.getSeconds().pad(2));
		}

		this.moveTo = function(pos){	//Get a new postition from the container cycle. Add it to our template CSS and let the animation happen
			this.yPos = pos;
			this.template.style.top=this.yPos+"px";
		}

		this.show = function(){			//If we are hidden, we might stop being hidden, if we're not newly created... in that case we wait one cycle.
			if(!this.firstTime){
				this.self.template.style.opacity = 1;
				this.hidden = false;
			}
			else this.firstTime = false;
		}

		this.remove = function(){		//First it hides us... then next cycle we are marked for removal and will be deleted by the container
			devlog("Removing article \""+this.self.title+"\"");
			this.hide();
			this.removed = true;
		}

		this.hide = function(){			//Hides us... with opacity... Animated
			this.template.style.opacity = 0;
			this.hidden = true;
		}

		//When we are created, we fetch our data and log to console that we are created. 
		this.self.getContentFromData(data);	
		devlog("Added new article \""+this.self.title+"\"");
	}


	//HELPER FUNCTIONS
	var devtools = /./;	//This is used to see if we have an open console, so that we don't spam unnecessarily
	devtools.toString = function() {
	  this.opened = true;
	}
	function devlog(msg){
		if(devtools){
			console.log(msg);
		}
	}

	//When page is loaded. Get the container by ID and create the container object with that element... AND WE'RE LIVE!
	var container = document.getElementById('omnifeed');
	var containerObj = new feedContainer(container);

}