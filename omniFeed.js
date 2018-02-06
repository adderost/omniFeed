var test;
window.onload = function(){

	//Object to keep track of the container and updates
	function feedContainer(container){
		this.self = this;
		this.container = container;
		this.articleTemplate;
		this.height = 0;
		this.templateHeight = 0;
		this.articles = Array();

		this.setupContainerAndTemplate = function(){
			this.self.height = this.self.container.clientHeight //Setup height of feed
			this.self.position = "relative";
			/*Get the template from dom*/
			var articleTemplate = this.self.container.getElementsByTagName('article').item(0); 
			this.self.templateHeight = articleTemplate.offsetHeight;
	
			/*Remove content and set styling on template*/
			articleTemplate.style.width = articleTemplate.innerWidth+"px";

			var templateChildren = articleTemplate.children;
			for(var i=0;i<templateChildren.length;i++){
				templateChildren[i].innerHTML="";
			}
			
			/*Remove the template from DOM */
			this.self.container.removeChild(articleTemplate);
			this.self.articleTemplate = articleTemplate;
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
		}


		this.setupContainerAndTemplate();
	}

	//Object to keep track of a single article
	function article(data, template){
		this.self = this;
		this.id = data['id'];
		this.published = data['published'];
		this.template = template;
		this.height = 0;

		this.getContentFromData = function(data){
			this.self.updated = data['updated'];
			this.self.author = data['authors'];
			this.self.title = data['title'];
			this.self.image = data['image'];
			this.self.text = data['text'];
			this.updateTemplate();
		}

		this.updateContent = function(data){
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

		this.self.getContentFromData(data);
		console.log("Added new article \""+this.self.title+"\"");
	}


	//HELPER FUNCTIONS

	var customAjax = function(url, callback = function(){}){	//Send getrequest and call the callback on success.
		var newXHR = new XMLHttpRequest();
		newXHR.addEventListener( 'load', callback );
		newXHR.open( 'GET', url );
		newXHR.send();
	}

	var fetchArticles = function(){
		customAjax("feed.php?imgWidth=300", function(){containerObj.updateArticles(JSON.parse(this.response))})
	}


	var container = document.getElementById('omnifeed');
	var containerObj = new feedContainer(container);

	window.setInterval(fetchArticles, 2000);
}