var test;
window.onload = function(){

	//Object to keep track of the container and updates
	function feedContainer(container){
		this.self = this;
		this.container = container;
		this.articleTemplate;
		this.height = 0;
		this.transitionTime = 0;
		this.margin = 0;
		this.templateHeight = 0;
		this.articles = Array();

		this.setupContainerAndTemplate = function(){
			this.self.height = this.self.container.clientHeight //Setup height of feed
			this.self.position = "relative";
			/*Get the template from dom*/
			var articleTemplate = this.self.container.getElementsByTagName('article').item(0); 
			this.self.templateHeight = articleTemplate.offsetHeight;
			this.self.transitionTime = articleTemplate.style.getPropertyValue('transition-duration');

			var duration = window.getComputedStyle(articleTemplate).getPropertyValue('transition-duration');
			this.self.transitionTime = ((duration.indexOf( 'ms' ) >- 1 ) ? parseFloat( duration ) : parseFloat( duration ) * 1000)

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
					this.articles[i].remove();
					this.articles[i] = false;
				}

			}
			var that = this;
			setTimeout(function(){that.sortAndMoveArticles()}, this.transitionTime);
		}

		this.sortAndMoveArticles = function(){
			//Move all articles to new array, remove deleted ones.
			var cleanArticles = Array();
			for(var i=0; i<this.articles.length;i++){
				if(this.articles[i]) cleanArticles.push(this.articles[i]);
			}

			//Sort the new list
			cleanArticles.sort(function(a,b){return(a.updated - b.updated)});

			//Move the articles
			var aggregatedPixels = 0;
			for(var i=0;i<cleanArticles.length;i++){
				position = aggregatedPixels + (i*this.margin);
				aggregatedPixels += cleanArticles[i].height;
				cleanArticles[i].moveTo(position);
				if(aggregatedPixels > this.height) cleanArticles[i].hide();
			}

			this.articles = cleanArticles;

			var that = this;
			setTimeout(function(){that.showArticles()}, this.transitionTime);
		}

		this.showArticles = function(){
			for(i = 0; i<this.articles.length ;i++){
				if( ( this.articles[i].yPos+this.articles[i].height) < this.self.height ) this.articles[i].show();
			}
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
			this.customAjax("feed.php?imgWidth=300&limit=4", function(){that.updateArticles(JSON.parse(this.response))})
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
					console.log("Updated article \""+this.self.title+"\"");
				}
				return(true);
			}
			else return(false);
		}

		this.updateTemplate = function(){
			if(this.self.image){
				this.self.template.getElementsByTagName('img').item(0).style.backgroundImage = "url("+this.self.image.url+")";
				this.self.template.getElementsByTagName('img').item(0).style.display = "block";
			}
			else this.self.template.getElementsByTagName('img').item(0).style.display = "none";
			if(this.self.title) this.self.template.getElementsByTagName('h1').item(0).innerHTML = this.self.title;
			if(this.self.published) this.self.template.getElementsByTagName('time').item(0).innerHTML = new Date(Date.parse(this.self.published)).toISOString();
			if(this.self.text) this.self.template.getElementsByTagName('div').item(0).innerHTML = this.self.text;
			if(this.self.author) this.self.template.getElementsByTagName('span').item(0).innerHTML = this.self.author;
		}

		this.moveTo = function(pos){
			this.yPos = pos;
			this.template.style.top=this.yPos+"px";
		}

		this.show = function(){
			this.self.template.style.opacity = 1;
		}

		this.remove = function(){
			console.log("Removing article \""+this.self.title+"\"");
			this.hide();
		}

		this.hide = function(){
			this.template.style.opacity = 0;
		}

		this.self.getContentFromData(data);
		console.log("Added new article \""+this.self.title+"\"");
	}


	//HELPER FUNCTIONS
	


	var container = document.getElementById('omnifeed');
	var containerObj = new feedContainer(container);

	
}