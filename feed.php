<?php
	$feedUrl  = "https://omni-content.omni.news/articles";
	$cacheString = hash("sha256",http_build_query($_GET));
	$cachePath = "cache/feed_".$cacheString;

	if(file_exists($cachePath)){
		if(filemtime($cachePath) > time()-30 ){
			$data=file_get_contents($cachePath);
			echo($data);
			die();
		}
	}

	$defaults = array(
		"limit" 			=> 10,
		"offset" 			=> 0,
		"sort" 				=> 'latest'	//latest || newsmix
	);
	$feedparams = array_key_merge_deceze($defaults, $_GET);

	$localDefaults = array(
		"showAds"			=> false,
		"breakCollections" 	=> true,
		"imgWidth" 			=> 640,
		'imgBaseUrl' 		=> "http://gfx.omni.se/images/"
	);
	$remoteParams = array_key_merge_deceze($defaults, $_GET);
	$localParams = array_key_merge_deceze($localDefaults, $_GET);
	$articledata = json_decode(file_get_contents($feedUrl."?".http_build_query($feedparams)))->articles;
	$cleanArticles = array();

	foreach($articledata as $article){
		$cleanArticle = cleanArticle($article, $localParams);
		if($cleanArticle) {
			if(isset($cleanArticle[0])){
				if($cleanArticle[0]=="isCollection") for($i=1;$i<sizeof($cleanArticle);$i++) $cleanArticles[] = $cleanArticle[$i];
				else $cleanArticles[] = $cleanArticle;
			}
			else $cleanArticles[] = $cleanArticle;
		}
	}
	$data = json_encode($cleanArticles);
	file_put_contents($cachePath, $data);
	echo($data);

	function cleanArticle($article = array(), $localParams){
		$isAd = false;
	

		if(sizeof($article) > 1){ //This is a collection
			if($localParams['breakCollections']){
				$collectionParts=array();
				$collectionParts[0]="isCollection";
				foreach($article as $subArticle){
					$cleanArticle = cleanArticle($subArticle,$localParams);
					if($cleanArticle) $collectionParts[]=$cleanArticle;
				}
				return($collectionParts);
			}
			return($article);
		}	
		
		if(is_array($article)){
			$content = $article[0];
			$newArticle=array();

			if($content->type == "Article"){
				if($content->meta->is_sponsored && !$localParams['showAds']) return(false);
				$newArticle['id'] = $content->article_id;
				$newArticle['authors'] = $content->authors[0]->title;
				if(sizeof($content->authors) > 1 ){ for($i=1; $i<sizeof($content->authors); $i++) {$newArticle['authors'].=", ".$content->authors[$i]->title; } }
				$newArticle['published'] = $content->meta->changes->published;
				$newArticle['updated'] = $content->meta->changes->updated;
				foreach($content->resources as $resource){
					if($resource->type == "Title")  $newArticle['title'] = $resource->text->value;
					if($resource->type == "Text"){ 
						foreach($resource->paragraphs as $paragraph){ 
							if(!isset($newArticle['text'])) $newArticle['text'] = ""; 
							if(isset($paragraph->text)) $newArticle['text'].="<p>".$paragraph->text->value."</p>"; 
						} 
					}
					if($resource->type == "Image") $newArticle['image'] = array('title'=> ((isset($resource->caption)) ? $resource->caption->value : ""), 'url' => $localParams['imgBaseUrl'].$resource->image_asset->id."?w=".$localParams['imgWidth']);
				}

				return($newArticle);
			}
			else return(false);
		}
		else return(false);
	}

	function array_key_merge_deceze($filtered, $changed) {
	    $merged = array_intersect_key($changed, $filtered) + $filtered;
	    ksort($merged);
	    return $merged;
	}


?>	