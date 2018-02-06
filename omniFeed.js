window.onload = function(){

	//Object to keep track of the container and updates
	function feedContainer(container){
		this.self = this;
		this.container = container;
		this.height = 0;
		this.articles = Array();

		this.setupContainer = function(){
			//this.self.container.innerHTML="";
			this.self.height = container.clientHeight
			console.log(this.self.height);
		}

		this.addArticle = function(data){
			this.articles.push(new article(data));
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

		this.fetchArticles = function(){
			customAjax("feed.php", function(){this.updateArticles(JSON.parse(this.response))})
		}

		this.customAjax = function(url, callback = function(){}){	//Send getrequest and call the callback on success.
			var newXHR = new XMLHttpRequest();
			newXHR.addEventListener( 'load', callback );
			newXHR.open( 'GET', url );
			newXHR.send();
		}


		this.setupContainer();
	}

	//Object to keep track of a single article
	function article(data){
		this.self = this;
		this.id = data['id'];
		this.published = data['published'];
		

		this.getContentFromData = function(data){
			this.self.updated = data['updated'];
			this.self.author = data['author'];
			this.self.title = data['title'];
			this.self.image = data['image'];
			this.self.text = data['text'];
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

		this.self.getContentFromData(data);
		console.log("Added new article \""+this.self.title+"\"");
	}

	var container = document.getElementById('omnifeed');
	var containerObj = new feedContainer(container);
}