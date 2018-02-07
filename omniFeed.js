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
			
			this.self.position = "relative";
			/*Get the template from dom*/
			var articleTemplate = this.self.container.getElementsByTagName('article').item(0); 
			this.self.transitionTime = articleTemplate.style.getPropertyValue('transition-duration');

			var duration = window.getComputedStyle(articleTemplate).getPropertyValue('transition-duration');
			this.self.transitionTime = Math.max(((duration.indexOf( 'ms' ) >- 1 ) ? parseFloat( duration ) : parseFloat( duration ) * 1000), 200);
			this.self.imageWidth = parseFloat(window.getComputedStyle(articleTemplate.getElementsByTagName('img').item(0)).getPropertyValue("width"));
			this.self.margin = parseFloat(window.getComputedStyle(articleTemplate).getPropertyValue('margin-bottom'))
	
			/*Remove content and set styling on template*/
			articleTemplate.style.width = articleTemplate.innerWidth+"px";
			articleTemplate.style.opacity = 0;
			articleTemplate.style.position = "absolute";

			var templateChildren = articleTemplate.children;
			for(var i=0;i<templateChildren.length;i++){
				templateChildren[i].innerHTML="";
			}
			
			/*Remove the template from DOM */
			this.self.container.removeChild(articleTemplate);
			this.self.articleTemplate = articleTemplate;

			var that = this;
			window.setTimeout(function(){that.fetchArticles();}, 0);
		}

		this.addArticle = function(data){
			var newArticle = new article(data, this.self.articleTemplate.cloneNode(true));
			this.articles.push(newArticle);
			//We need to sort so that it doesn't appear out of order.
			this.articles.sort(function(a,b){
				return(Date.parse(b.updated) - Date.parse(a.updated));
			});

			this.container.appendChild(newArticle.template);
		}

		this.updateArticles = function(feed){
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
			this.removeDeleted(feed);
		}

		this.removeDeleted = function(feed){
			for(var i=0; i<this.articles.length; i++){
				var found = false;
				for (var j=0; j<feed.length;j++){
					if(this.articles[i].id == feed[j]['id']) found=true;
				}
				if(!found){
					if(this.articles[i].removed) {
						this.container.removeChild(this.articles[i].template);
						this.articles[i] = false;
					}
					else{
						this.articles[i].remove();
					}
				}
			}
			var that = this;
			setTimeout(function(){that.sortAndMoveArticles()}, this.transitionTime);
		}

		this.sortAndMoveArticles = function(){
			this.self.height = this.self.container.clientHeight //Setup height of feed

			//Move all articles to new array, remove deleted ones.
			var cleanArticles = Array();
			for(var i=0; i<this.articles.length;i++){
				if(this.articles[i]) cleanArticles.push(this.articles[i]);
			}

			//Sort the new list
			cleanArticles.sort(function(a,b){
				return(Date.parse(b.updated) - Date.parse(a.updated));
			});

			//Move the articles
			var aggregatedPixels = 0;
			for(var i=0;i<cleanArticles.length;i++){
				position = aggregatedPixels + (i*this.margin);
				aggregatedPixels += cleanArticles[i].height;
				cleanArticles[i].moveTo(position);
				if(aggregatedPixels >= this.height) cleanArticles[i].hide();
			}

			this.articles = cleanArticles;

			var that = this;
			setTimeout(function(){that.showArticles()}, this.transitionTime);
		}

		this.showArticles = function(){
			if(!this.firstTime){
				for(i = 0; i<this.articles.length ;i++){
					if( ( this.articles[i].yPos+this.articles[i].height) < this.self.height ){
						this.articles[i].show();	
					} 
					else this.articles[i].hide();
					if( this.articles[i].yPos > this.self.height ){
						this.numberOfArticlesToShow=i
						break;
					}
				}
				if(this.articles[this.articles.length-1].yPos + this.articles[this.articles.length-1].height < this.self.height) this.numberOfArticlesToShow += 1;
			}
			else this.firstTime = false;

			var that = this;
			window.setTimeout(function(){that.fetchArticles();}, (this.transitionTime*2));
		}

		this.customAjax = function(url, callback = function(){}){	//Send getrequest and call the callback on success.
			var newXHR = new XMLHttpRequest();
			newXHR.addEventListener( 'load', callback );
			newXHR.open( 'GET', url );
			newXHR.send();
		}

		this.fetchArticles = function(){
			var that = this;
			this.customAjax("feed.php?imgWidth="+(this.imageWidth*2)+"&limit="+this.numberOfArticlesToShow, function(){that.updateArticles(JSON.parse(this.response))})
		}

		this.setupContainerAndTemplate();
	}

	//Object to keep track of a single article
	function article(data, template, container){
		this.self = this;
		this.id = data['id'];
		this.published = data['published'];
		this.template = template;
		this.height = 0;
		this.yPos = 0;
		this.hidden = false;
		this.removed = false;
		this.firstTime = true;

		this.getContentFromData = function(data){
			this.self.updated = data['updated'];
			this.self.author = data['authors'];
			this.self.title = data['title'];
			this.self.image = data['image'];
			this.self.text = data['text'];
			this.updateTemplate();
		}

		this.updateContent = function(data){
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

		this.updateTemplate = function(){
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
				if(this.self.template.getElementsByTagName('time').length > 0) this.self.template.getElementsByTagName('time').item(0).innerHTML = this.formatTime(new Date(Date.parse(this.self.updated)));
			}
			
			if(this.self.text) {
				if(this.self.template.getElementsByTagName('div').length > 0) this.self.template.getElementsByTagName('div').item(0).innerHTML = this.self.text;
			}
			
			if(this.self.author) {
				if(this.self.template.getElementsByTagName('span').length > 0) this.self.template.getElementsByTagName('span').item(0).innerHTML = this.self.author;
			}
		}

		this.formatTime = function(time){
			Number.prototype.pad = function(size) {
			  var s = String(this);
			  while (s.length < (size || 2)) {s = "0" + s;}
			  return s;
			}
			return (time.getFullYear()+"-"+time.getMonth().pad(2)+"-"+time.getDate().pad(2)+" "+time.getHours().pad(2)+":"+time.getMinutes().pad(2)+":"+time.getSeconds().pad(2));
		}

		this.moveTo = function(pos){
			this.yPos = pos;
			this.template.style.top=this.yPos+"px";
		}

		this.show = function(){
			if(!this.firstTime){
				this.self.template.style.opacity = 1;
				this.hidden = false;
			}
			else this.firstTime = false;
		}

		this.remove = function(){
			devlog("Removing article \""+this.self.title+"\"");
			this.hide();
			this.removed = true;
		}

		this.hide = function(){
			this.template.style.opacity = 0;
			this.hidden = true;
		}

		this.self.getContentFromData(data);
		devlog("Added new article \""+this.self.title+"\"");
	}


	//HELPER FUNCTIONS
	var devtools = /./;
	devtools.toString = function() {
	  this.opened = true;
	}

	function devlog(msg){
		if(devtools){
			console.log(msg);
		}
	}

	//Start stuff
	var container = document.getElementById('omnifeed');
	var containerObj = new feedContainer(container);

}