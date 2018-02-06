window.onload = function(){
	var container = document.getElementById('omnifeed');
	container.innerHTML = "";

	var articles = Array();

	var addArticle = function(data){
		articles.push(new article(data));
	}

	var updateArticles = function(feed){
		for(i=0;i<feed.length;i++){
			var exists = false;
			for(j=0; j<articles.length; j++){
				if(articles[j].updateContent(feed[i])){
					exists = true;
					break;
				}
			}
			if(!exists){
				addArticle(feed[i]);
			}
		}
	}

	var fetchArticles = function(){
		customAjax("feed.php", function(){updateArticles(JSON.parse(this.response))})
	}

	var customAjax = function(url, callback = function(){}){	//Send getrequest and call the callback on success.
		var newXHR = new XMLHttpRequest();
		newXHR.addEventListener( 'load', callback );
		newXHR.open( 'GET', url );
		newXHR.send();
	}
	
	window.setInterval(fetchArticles, 2000);


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
}