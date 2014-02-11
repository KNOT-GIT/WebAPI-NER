var core;

$(document).ready(
function() {
  core = new GUICore();
});


function GUICore(){
  this.gKBManager = new KBManager("#kbmanagerblock");
  this.gAPI = new APISwitches("#apiswitches");
  this.gInput = new Input("#inputblock");
  
  this.gEntityTab = new EntityTab("#EntityTabContainer");
  this.gOutputTab = new OutputTabs("#OutputTabContainer");
  this.gEntityInfo = new EntityInfo("#EntityInfoContainer");
  this.gCarousel = new EntityImg("#EntityTabContainer");
  
  this.gbRV = new ResultVisual();
  this.gbRR = new ResultRaw();
  
  
  
  this.gKBManager.init();
  this.gAPI.init();
  this.gInput.init();
  this.gEntityTab.init();
  this.gOutputTab.init();
  this.gEntityInfo.init();
  this.gCarousel.init();


  this.gOutputTab.addTab("Visual",this.gbRV);
  this.gOutputTab.addTab("Json",this.gbRR);  
  
  this.gEntityTab.registerOnSelectCallback($.proxy(this.onEntitySelectFromList,this));
  this.gbRV.registerOnSelectCallback($.proxy(this.onEntitySelectFromText,this));
  this.gEntityTab.registerOnColorChangeCallback($.proxy(this.saveColor,this));

  this.gInput.addAnnotateCallback($.proxy(this.onAnnotate,this));
  this.gKBManager.registerOnChangeCallback($.proxy(this.onKbChange,this));
  
  this.item_list = null;
  this.kb_data = null;
  this.c_picker_element= null;
  this.selected_element = null;
  //localStorage.removeItem("colors");
  if(localStorage["colors"] != null){
  	  this.colors = JSON.parse(localStorage["colors"]);
  	  //console.log(this.colors);
  }else{
	  this.colors = {"a":"#00CC00","p":"#00CC00","l":"#667cff","w":"#ff9e00","c":"#ff5ce1",
				   "e":"#b0bfd2","f":"#9666ff","d":"#ffd792","m":"#bf0000",
				   "g":"#9e90a3","n":"#669900","s":"#c5e26d","t":"#ffd070"};
  }
  
  //this.gbRV.setColors(this.colors);
  this.gEntityTab.setColors(this.colors);
  for(var c in this.colors){
  		changecss("."+c,"color",this.colors[c]);
  		changecss("#est_filter-"+c,"background-color",this.colors[c]);
  }
};



GUICore.prototype.onAnnotate = function(){
	url = this.gAPI.getFormatedURL();
	data = this.gAPI.getFormatedData();
	text = this.gInput.getInputText();
	
	if(url == null || text == null){
		return false;
	}
	
	$.ajax({  
  			type: "POST",  
  			url: url,  
  			data: {"text":text},
  			dataType: 'json',
  			success: $.proxy(this.outputGenerator,this),
  			error:AjaxErrorHandler
		});
	
};

GUICore.prototype.onKbChange = function(){
	this.gAPI.refreshAll();
	
};


GUICore.prototype.outputGenerator = function(raw_data){
	
	var datesID = 0;
	var interID = 0;
	this.item_list = [];
	this.kb_data = [];
	
	if(raw_data["header"]["status"] != 0){
		ServerErrorHandler(raw_data["header"]["msg"]);
		return;
	}
	
	data = raw_data["result"];
  
    this.gbRR.clear();
    this.gbRV.clear();
    this.gEntityTab.clear();
    this.gEntityInfo.clear();
    this.gCarousel.clear();
    	
    var fields = ["preferred term","name","display term"];
	for(var i in data){
		var haveTextCol = false;
		var item = data[i];
		var kb_row;
		if(item.hasOwnProperty("kb_row")){
			if(Array.isArray(item.kb_row)){
				kb_row = item.kb_row[0];
			}else{
				kb_row = item.kb_row;
			}
			
			kbID = kb_row.id.replace(":","-");
			var iitems = item.items;
			for(var d in iitems){
				var i = iitems[d];
				i.push(kbID);
				this.item_list.push(i);
			}
			
		
			for(var i in fields){
				if(kb_row[fields[i]] != "" && kb_row[fields[i]] != undefined){
					haveTextCol = true;
					break;
				}
			}
			console.log(haveTextCol);
			if(haveTextCol == false){
				item.kb_row["hidden text"] = iitems[0][2];
				//console.log(item.kb_row);
			}
			
			this.kb_data[kbID] = item.kb_row;
			
		}else if (item.hasOwnProperty("dates")){
			dateList = item["dates"];
			for(var d in dateList){
				var date = dateList[d];
				var id ="s-" + datesID.toString();
				date.push(id);
				this.item_list.push(date);
				this.kb_data[id] = {'id':id,'name':date[2], 'normalized':date[3]};
				datesID++;
			}
		}else if (item.hasOwnProperty("intervals")){ 
			dateList = item["intervals"];
			for(var d in dateList){
				var date = dateList[d];
				var id = "t-" + datesID.toString();
				date.push(id);
				this.item_list.push(date);
				this.kb_data[id] = {'id':id,'name':date[2],'normalized-from':date[3],'normalized-to':date[4]};
				datesID++;
			}

		}else{continue;}
	}
	
	this.item_list.sort(function(a,b){
    return a[0] - b[0];
	});
	
	
	
	this.gbRR.update(JSON.stringify(raw_data, null, "  "));
	this.gbRV.update(this.gInput.getInputText(),this.item_list);
	
	$('#myTab a[href="#output"]').tab('show');
	
	this.gEntityTab.update(raw_data["header"]["groups"], this.kb_data);
	
};

GUICore.prototype.onEntitySelectFromText = function(event){
	
	

	var element = event.target;
	var group_id = $(element).attr("class").split(/\s+/)[1];
	
	this.gEntityTab.focusEntity(group_id);
	
	this.onEntitySelect(group_id);
	
	if(event.ctrlKey){
		//alert($(element).text());
		this.c_picker_element = $(element);
		var color = $(element).css("color");
		$(element).colorpicker({"color":color}).colorpicker('show');
		$(element).on("hidePicker",$.proxy(this.destroyColorPicker,this));
		$(element).on("changeColor",$.proxy(this.onUpdateColor,this));
		
	}
	
	
};

GUICore.prototype.onEntitySelectFromList = function(event){
	var element = event.target;
	var group_id = $(element).attr("class").split(/\s+/)[0];;
	this.gbRV.focusEntity(group_id);
	this.onEntitySelect(group_id);
	
};


GUICore.prototype.destroyColorPicker = function(ev){
	if(this.c_picker_element != null){
		this.c_picker_element.colorpicker('destroy');
		var group_id = this.c_picker_element.attr("class").split(/\s+/)[0].split("-")[0];
		var color = ev.color.toHex();
		this.saveColor(group_id,color);
		this.c_picker_element.css("color","");
		this.c_picker_element = null;
	}
	
};

GUICore.prototype.onUpdateColor = function(ev){
	if(this.c_picker_element != null){
		var group_id = this.c_picker_element.attr("class").split(/\s+/)[0];
		var color = ev.color.toHex();
		this.c_picker_element.css("color",color);
	}
};

GUICore.prototype.saveColor = function(group_id, color){
		//alert([group_id,color]);
		this.colors[group_id] = color;
		localStorage["colors"] = JSON.stringify(this.colors);
		console.log([group_id, color]);
		changecss("."+group_id,"color",color);
		changecss("#est_filter-"+group_id,"background-color",color);
	
};

GUICore.prototype.onEntitySelect = function(group_id){
	$(".sel").each(function(){
	  $(this).removeClass("sel");
	  
	});
	
	$("."+group_id).each(function(){
		$(this).addClass("sel");
	})	;
	
	this.gEntityInfo.update(this.kb_data[group_id]);
	this.gCarousel.update(this.kb_data[group_id]);
};


function AjaxErrorHandler(xhr, status, error){
	var errorMessage;
	if(xhr.status == 500){
		errorMessage = "An server error occurred with HTML code 500 (Interal Server Error).<br/>Visit server log for more information.";
	}else if(xhr.status == 404){
		errorMessage = "Requested data not found. Try refresh gui and check if server is running.";
	}else{
		errorMessage = "An unknow error occurred. <br/>HTML Status:" + xhr.status + "<br/>Status: " + status + "<br/>HTML Error Message: " + error;
		errorMessage += "<br/>Check if server is running and check server log for more information<br/>";
	}
	
	var modalcontent = $("#modalContent");
	modalcontent.empty();
	modalcontent.append(formatError(errorMessage));
	$("#modalDialog").modal('show');
};

function ServerErrorHandler(msg_list){
	var modalcontent = $("#modalContent");
	modalcontent.empty();
	for(var i in msg_list){
		modalcontent.append(formatError(msg_list[i]));
	}
	$("#modalDialog").modal('show');
}

function formatError(msg){
	return $(document.createElement("div")).addClass("alert alert-error").append(
		$(document.createElement("strong")).text("WARNING!"),
		$(document.createElement("br")),
		msg
	);
}


