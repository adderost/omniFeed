window.onload = function(){
	var container = document.getElementById('omnifeed');
	container.innerHTML = "";

	var articles = Array();


	var updateArticles = function(feed){
		console.log(feed);
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

	fetchArticles();
}