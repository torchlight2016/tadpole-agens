/**
 * 	tadpole ace editor extension.
 *  ace example : 
 *  	https://github.com/ajaxorg/ace/wiki/Embedding-API
 *  
 *  Default keyboard shortcuts : 
 *  	https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts
 *  
 *  Dynamically update syntax highlighting mode rules for the Ace Editor:
 *  	http://stackoverflow.com/questions/22166784/dynamically-update-syntax-highlighting-mode-rules-for-the-ace-editor
 *  
 *  @date 2015.05.
 *  @author hangum, hangum@gmail.com
 */
var editorService = {

	/** initialize editor */
	RDBinitEditor : function(varMode, varType, varInitText, varAutoSave, varTheme, varFontSize, varIsWrap, varWarpLimit, varIsShowGutter) {},
	MONGODBinitEditor : function(varMode, varInitText, varTheme, varFontSize, varIsWrap, varWarpLimit, varIsShowGutter) {},
	/** change editor style */
	changeEditorStyle : function(varTheme, varFontSize, varIsWrap, varWarpLimit, varIsShowGutter) {},
	
	/** set editor focus */
	setFocus : function() {},
	
	/** define theme */
	setTheme : function(varTheme) {},

	/** define fontsize */
	setFontSize : function(varFontSize) {},
	
	/** define wrap */
	setWrap : function(varBool, varLimit) {},
	
	/** 자바에서 저장했을때 호출 합니다 */
	saveData : function() {},

	setTabSize : function(varTabSize) {},
	getAllText : function() {},
	getSelectedText : function() {},
	setSelectedText : function() {},
	
	/** insert text */
	insertText : function(varText) {},
	
	/** add text */
	addText : function(varText) {},
	
	/** is block text */
	isBlockText : function() {},
	
	/**
	 * 에디터 기존 내용을 지운 후에 새롭게 텍스트를 넣습니다.
	 * -예, 쿼리 포멧 기능
	 */
	reNewText : function(varText) {},
	
	/** help dialog */
	HELP_POPUP : "60",
	helpDialog : function() {},
	
	/** dirty chage event */
	DIRTY_CHANGED 		: "1",
	CONTENT_ASSIST		: "5",
		
	SAVE 				: "15",
	AUTO_SAVE			: "16",
	EXECUTE_QUERY 		: "25",
	EXECUTE_ALL_QUERY 	: "26",
	EXECUTE_PLAN  		: "30",
	EXECUTE_FORMAT		: "35",
	
	F4_DML_OPEN			: "40",
	GENERATE_SELECT		: "45"
};

/** debug option */
var isDebug = false;

var varDBType;
/** 에디터가 저장 할 수 있는 상태인지 */
var isEdited = false;
/** 에디터에서 사용하는 쿼리 분리자 */
var varDelimiter = ";";
/** open 된 에디터 타입 */
var varEditorType = 'TABLES';
/** default key word list */
var default_keywordList = [];
/** auto save에서 사용하기 위해 마지막으로 호출한 값을 기록 */
var strLastContent;


/** initialize editor */
//{
	var Range = ace.require("ace/range").Range;
	var langTools = ace.require("ace/ext/language_tools");
	var editor = ace.edit("editor");

	var StatusBar = ace.require('ace/ext/statusbar').StatusBar;
    var statusBar = new StatusBar(editor, document.getElementById('statusBar'));
    var EditSession = ace.require("ace/edit_session").EditSession;
	var UndoManager = ace.require("./undomanager").UndoManager;
	editor.resize(true)
	editor.setShowPrintMargin(true);
	editor.setHighlightActiveLine(true);
//	editor.setOption('firstLineNumber', 1);
	
	editor.setOptions({
	    enableBasicAutocompletion: true,
	    enableSnippets: true,
	    enableLiveAutocompletion: false
	}); 
	
//};

/** 
 * 에디터를 초기화 합니다. 
 * @param dBType db 	type(ex: sqlite, pgsql), EditorDefine#EXT_SQLite
 * @param editorType 	editorType (sql or procedure )
 * @param varInitText
 * @param varAutoSave
 * @param varTheme is editor theme
 * @param varFontSize  font size of editor
 * @param varIsWrap Wrap of editor
 * @param varWarpLimit Wrap limit of editor
 * @param varIsShowGutter Show gutter is editoe
 */
editorService.RDBinitEditor = function(dBType, editorType, varInitText, varAutoSave, varTheme, varFontSize, varIsWrap, varWarpLimit, varIsShowGutter) {
	varDBType = dBType;
	varEditorType = editorType;
	
	var session = new EditSession(varInitText);
	strLastContent = varInitText;
	try {
		session.setUndoManager(new UndoManager());
		if(varEditorType == "json") {
			session.setMode("ace/mode/json");
		} else {
			var TextMode = ace.require("ace/mode/sql").Mode;
			var dynamicMode = new TextMode();
			dynamicMode.HighlightRules = ace.require("DynHighlightRules").DynHighlightRules;
			session.setMode(dynamicMode);
		}
		
		session.on('change', function() {
			if(!isEdited) {
				try {
					AceEditorBrowserHandler(editorService.DIRTY_CHANGED);
				} catch(e) {
					console.log(e);
				}
				isEdited = true;
			}
		});
		
		// makes default key 
		tmpCtsList = session.$mode.$highlightRules.$keywordList;
		for(var i=0; i< tmpCtsList.length; i++) {
			default_keywordList.push({value: tmpCtsList[i], meta: "Keyword"});
		}
	} catch(e) {
		console.log(e);
	}
	
	try{
		editor.setTheme("ace/theme/" + varTheme);
		editor.setFontSize(varFontSize + 'px');
		editor.renderer.setShowGutter(varIsShowGutter === 'true');
	} catch(e) {
		console.log(e);
	}
	try {
		var boolIsWrap = varIsWrap === 'true';
		session.setUseWrapMode(boolIsWrap);
		if(boolIsWrap) session.setWrapLimitRange(varWarpLimit, varWarpLimit);
	} catch(e) {
		console.log(e);
	}
	
	if(varAutoSave == 'true') autoSave();
	editor.setSession(session);
	
	// 제일 마지막 행으로 이동한다.
	editor.gotoLine(editor.session.getLength()+1);
	editor.focus();
};
/**
 *  auto save
 */
autoSave = function() {
	var varAllTxt = editorService.getAllText();
	if(strLastContent != varAllTxt) {
		try {
			if('' != varAllTxt) {
				var boolDoSave = AceEditorBrowserHandler(editorService.AUTO_SAVE, varAllTxt);
				strLastContent = varAllTxt;
			}
		} catch(e) {
			console.log(e);
		}
	}
	
	window.setTimeout(autoSave, 30 * 1000);
}

/** 
 * 에디터를 초기화 합니다. 
 * @param varMode sql type(ex: sqlite, pgsql, javascript) EditorDefine#EXT_SQLite
 * @param varInitText
 */
editorService.MONGODBinitEditor = function(varMode, varInitText, varTheme, varFontSize, varIsWrap, varWarpLimit, varIsShowGutter) {
	editorService.RDBinitEditor(varMode, 'NONE', varInitText, 'false', varTheme, varFontSize, varIsWrap, varWarpLimit, varIsShowGutter);
};

/**
 * change editor style
 */
editorService.changeEditorStyle = function(varTheme, varFontSize, varIsWrap, varWarpLimit, varIsShowGutter) {
	editor.setTheme("ace/theme/" + varTheme);
	editor.setFontSize(varFontSize + 'px');
	editor.renderer.setShowGutter(varIsShowGutter === 'true');
	
	var boolIsWrap = varIsWrap === 'true';
	session.setUseWrapMode(boolIsWrap);
	if(boolIsWrap) session.setWrapLimitRange(varWarpLimit, varWarpLimit);
	editor.setSession(session);
};

/**  자바에서 에디터가 저장되었을때 에디터 수정 메시지를 받기위해 호출되어 집니다. */
editorService.saveData = function() {
	isEdited = false;
}
/** set editor focus */
editorService.setFocus = function() {
	editor.focus();
};

//==[ Define short key ]======================================================================================================================
var shortcutErrMsg = 'Oops, an execution error has occured!\nEither click the "SQL" button of the tool bar, or open a new editor window.';
editor.commands.on("afterExec", function(e) {
	if(varEditorType != "json") {
		if (e.command.name == "insertstring"&&/^[\\.\(.]$/.test(e.args)) {
			tdbContentAssist();
	    }
	}
}); 
editor.commands.addCommand({
    name: 'contentassist',
    bindKey: {win: 'Ctrl-Space',  mac: 'Ctrl-Space'},
    exec: function(editor) {
    	tdbContentAssist();
    },
    readOnly: false
});

/** content assist */
tdbContentAssist = function() {
	try {
		var arrySQL = caParsePartSQL();
		var newKeyword = AceEditorBrowserHandler(editorService.CONTENT_ASSIST, arrySQL[0], arrySQL[1]);
		var newCompletions = [];
		
		if("" != newKeyword) {
			var arryGroupKeyWord = newKeyword.split("||");
			for(var i=0; i<arryGroupKeyWord.length; i++) {
				var keyWord = arryGroupKeyWord[i].split("|");
				newCompletions.push({value: keyWord[0], score: 2, meta: keyWord[1]});
			}
		}
		
		// 마지막에 디폴트 키워드를 추가한다.
		Array.prototype.push.apply(newCompletions, default_keywordList);
		
		// setting default snippet
		editor.completers = [langTools.snippetCompleter];
		
		// 기존 content assist를 초기화한다.
		editor.completers.push({
			getCompletions: function(editor, session, pos, prefix, callback) {
				callback(null, newCompletions);
			}
		});
		editor.execCommand("startAutocomplete");
	}catch(e) {
		console.log(e);
	}
};

editor.commands.addCommand({
    name: 'save',
    bindKey: {win: 'Ctrl-S',  mac: 'Command-S'},
    exec: function(editor) {
    	try {
    		var boolDoSave = AceEditorBrowserHandler(editorService.SAVE, editorService.getAllText());
    		if(boolDoSave) editorService.saveData();
    	}catch(e) {
    		console.log(e);
    		alert(shortcutErrMsg);
    	}
    },
    readOnly: false
});

/**
 * editor 텍스트가 block인지 유무?
 * @returns {Boolean}
 */
editorService.isBlockText = function() {
	if("" != editor.getSelectedText()) {
		return true;
	}
	
	return false;
}

editor.commands.addCommand({
    name: 'executeQuery',
    bindKey: {win: 'Ctrl-Enter',  mac: 'Command-Enter'},
    exec: function(editor) {
    	executeQuery();
    },
    readOnly: false
});
editor.commands.addCommand({
    name: 'executeQuery2',
    bindKey: {win: 'F9',  mac: 'F9'},
    exec: function(editor) {
    	executeQuery();
    },
    readOnly: false
});
editor.commands.addCommand({
    name: 'executeQuery3',
    bindKey: {win: 'F5',  mac: 'F5'},
    exec: function(editor) {
    	executeQuery();
    },
    readOnly: false
});
executeQuery = function() {
	try {
		var selectTxt = editorService.getSelectedText();
			AceEditorBrowserHandler(editorService.EXECUTE_QUERY, selectTxt, editorService.isBlockText());
	} catch(e) {
		console.log(e);
		alert(shortcutErrMsg);
	}
};
editor.commands.addCommand({
    name: 'executeObjectViewer',
    bindKey: {win: 'F4',  mac: 'F4'},
    exec: function(editor) {
    	try {
    		var varSelectionContent = editor.getSelectedText();
    		if(varSelectionContent != "") {
    			AceEditorBrowserHandler(editorService.F4_DML_OPEN, varSelectionContent);
    		} else {
    			// 현재 행의 텍스트.
    			var startQueryLine = editor.session.getLine(editor.getCursorPosition().row);
    			if(startQueryLine != "") {
	    			// 공백 배열로 만들어  제일 마지막 텍스트를 가져온다. 
    				var strObjectName = parseCursorObject();
	    			AceEditorBrowserHandler(editorService.F4_DML_OPEN, strObjectName);
    			}
    		}
    	} catch(e) {
    		console.log(e);
    	}
    },
    readOnly: false
});
editor.commands.addCommand({
    name: 'executeTableSelect',
    bindKey: {win: 'Ctrl-I',  mac: 'Command-I'},
    exec: function(editor) {
    	try {
    		var varSelectionContent = editor.getSelectedText();
    		if(varSelectionContent != "") {
    			AceEditorBrowserHandler(editorService.GENERATE_SELECT, varSelectionContent);
    		} else {
    			// 현재 행의 텍스트.
    			var startQueryLine = editor.session.getLine(editor.getCursorPosition().row);
    			if(startQueryLine != "") {
	    			var strObjectName = parseCursorObject();
	    			AceEditorBrowserHandler(editorService.GENERATE_SELECT, strObjectName);
    			}
    		}
    	} catch(e) {
    		console.log(e);
    	}
    },
    readOnly: false
});
/**
 * parse cursor object
 * @returns
 */
parseCursorObject = function() {
	
	try {
		var strTokenAt = editor.session.getTokenAt(editor.getCursorPosition().row, editor.getCursorPosition().column);
		if("" === strTokenAt.value) {
			// 공백 배열로 만들어  제일 마지막 텍스트를 가져온다. 
			var startQueryLine = editor.session.getLine(editor.getCursorPosition().row);
			var strBeforeTxt = startQueryLine.substring(0, editor.getCursorPosition().column);
			var strArryBeforeTxt = strBeforeTxt.split(' ');

			// 공백 배열로 만들어 제일 처음 백스트를 가져온다.
			var strAfterTxt = startQueryLine.substring(editor.getCursorPosition().column);
			var strArryAfterTxt = strAfterTxt.split(' ');

			var strObjectName = strArryBeforeTxt[strArryBeforeTxt.length-1] + strArryAfterTxt[0];

			// 마지막 문자가 ; 라면 제거해준다.
			return strObjectName.replace(varDelimiter, "");
			
		} else {
			return strTokenAt.value;
		}
	} catch(e) {
		console.log(e);
	}
}
editor.commands.addCommand({
    name: 'executePlan',
    bindKey: {win: 'Ctrl-E',  mac: 'Command-E'},
    exec: function(editor) {
    	try {
   			AceEditorBrowserHandler(editorService.EXECUTE_PLAN, editorService.getSelectedText(), editorService.isBlockText());
	    } catch(e) {
			console.log(e);
			alert(shortcutErrMsg);
		}
    },
    readOnly: false
});
editor.commands.addCommand({
    name: 'format',
    bindKey: {win: 'Ctrl-Shift-F',  mac: 'Command-Shift-F'},
    exec: function(editor) {
    	try {
    		var varFormat = AceEditorBrowserHandler(editorService.EXECUTE_FORMAT, editorService.getAllText());
    		editor.setValue(varFormat);
    	} catch(e) {
    		console.log(e);
    		alert(shortcutErrMsg);
    	}
    },
    readOnly: false
});
editor.commands.addCommand({
    name: 'changeLowCase',
    bindKey: {win: 'Ctrl-Shift-Y',  mac: 'Command-Shift-Y'},
    exec: function(editor) {
    	editor.toLowerCase();
    },
    readOnly: false
});
editor.commands.addCommand({
    name: 'changeUpperCase',
    bindKey: {win: 'Ctrl-Shift-X',  mac: 'Command-Shift-X'},
    exec: function(editor) {
    	editor.toUpperCase();
    },
    readOnly: false
});
editor.commands.addCommand({
    name: 'helpDialog',
    bindKey: {win: 'Ctrl-Shift-L',  mac: 'Command-Shift-L'},
    exec: function(editor) {
    	try {
    		editorService.helpDialog();
    	} catch(e) {
    		console.log(e);
    	}
    },
    readOnly: false
});
editor.commands.addCommand({
    name: 'cleagePage',
    bindKey: {win: 'Ctrl-F7',  mac: 'Command-F7'},
    exec: function(editor) {
    	editor.setValue("");
    },
    readOnly: false
});

/** define tab size */
editorService.setTabSize = function(varTabSize) {
	editor.getSession().setTabSize(varTabSize);
};
/** getAllText */
editorService.getAllText = function() {
	return editor.getValue();
};
/** set seltected text */
editorService.setSelectedText = function() {	//
	// 처리 안해줘도된다.
	if(varEditorType == "PROCEDURES" ||
		varEditorType == "FUNCTIONS" ||
		varEditorType == "TRIGGERS") {
	} else { 
		if("" == editor.getSelectedText())  {
			editor.selection.setRange(new Range(_startRow, _startColumn, _endRow, _endColumn));
		}
	}
};
/**
 * 수행해야할 작업 목록을 가져옵니다.
 * 
 * 1. 선택된 블럭이 있다면 블럭의 쿼리를 가져옵니다.
 * 2. 구분자가 없다면 쿼리 전체를 가져옵니다.
 * 3. 구분자가 2개이상이라면 구분자를 기준으로 선택된 행의 구분자를 처리합니다.
 */
editorService.getSelectedText = function() {
	var varEditorContent = editor.getValue();
	if("" == varEditorContent) return "";
	
	//
	// 프로시저 평선 트리거는 에디터 모두를 리턴합니다. 
	//
	if(varEditorType == "PROCEDURES" ||
		varEditorType == "FUNCTIONS" ||
		varEditorType == "TRIGGERS") {
		
		// 선택된 텍스트가 있다면 우선적으로 리턴합니다.
		var varSelectionContent = editor.getSelectedText();
		if("" != varSelectionContent)  {
			return varSelectionContent;
		} else {
			return varEditorContent;
		}
	} 
	
	//
	// 일반 에디터. 
	// 
	try {
		// 선택된 텍스트가 있다면 우선적으로 리턴합니다.
		var varSelectionContent = editor.getSelectedText();
		if("" != varSelectionContent)  {
			return varSelectionContent;
			
		// 선택된 텍스트가 없다면 구분자 만큼 넘겨줍니다.
		} else {
			var arrySQL = parsePartSQL();
			return arrySQL[0];
		}
	} catch(e) {
		console.log(e);
	}
};

// starts with
function stringStartsWith (string, prefix) {
    return string.slice(0, prefix.length) == prefix;
}

/**
 * insert text
 */
editorService.insertText = function(varText) {
	try {
		editor.insert(varText);
		editor.focus();
	} catch(e) {
		console.log(e);
	}
};
editorService.addText = function(varText) {
	try {
		if("" == editor.getValue()) {
			editor.insert(varText);
		} else {
			editor.gotoLine(editor.session.getLength()+1);
			editor.insert("\n" + varText);
			
		}
		editor.focus();
	} catch(e) {
		console.log(e);
	}
};
editorService.reNewText = function(varText) {
	editor.setValue("");
	editor.insert(varText);
};
/**  help dilaog */
editorService.helpDialog = function() {
	try {
		AceEditorBrowserHandler(editorService.HELP_POPUP);
	} catch(e) {
		console.log(e);
	}
};

/** content assist parse part sql */
caParsePartSQL = function() {
	var varCursor = editor.getCursorPosition();
	var partQuery = findCursorSQL(varCursor.row, varCursor.column);
	
	return partQuery;
}

/** parse part sql */
parsePartSQL = function() {
	var varCursor = editor.getCursorPosition();
	var partQuery = findCursorSQL(varCursor.row, varCursor.column);
	
	// 만약에 쿼리를 발견하지 못했다면, 자신의 윗행으로 찾아 마지막 종료 문자의 쿼리를 찾습니다.
	var isQuery = false;
	var checkQuery = partQuery[0].split("\n")
	for(var i=0; i<checkQuery.length; i++) {
		if(checkQuery[i].trim() == "" | stringStartsWith(checkQuery[i], "--")  | stringStartsWith(checkQuery[i], "/*")) {
		} else {
			isQuery = true;
			break;
		}
	}
	
	if(isQuery == false) {
		var intDelimiterLineNumber = findPreviousLineText(varCursor.row);
		if(-1 !== intDelimiterLineNumber) {
			var searchLien = editor.session.getLine(intDelimiterLineNumber);
			partQuery = findCursorSQL(intDelimiterLineNumber, searchLien.length);
		}
	}
	
	return partQuery;
}

/**
 * 선택 행의 위쪽으로 분리자가 있는 행의 번호를 리턴합니다.
 * @param varLineNum
 */
findPreviousLineText = function(currentRow) {
	var startRow = -1
	while(currentRow > 0) {
 		var textTokens = editor.session.getTokens(currentRow).filter(function(t) {
 			return t.type === "text";
 		});
	
 		for(var i=0; i<textTokens.length; i++) {
 			if(stringStartsWith(textTokens[i].value, varDelimiter)) {
 				startRow = currentRow;
 				break;
 			}
 		}
 		if(startRow >= 0) break;
 			
 		currentRow--;
 	}
	return startRow;
}

/**
 * 
 * @param varRow
 * @param varColumn
 * @returns {String}
 */
var _startRow, _startColumn, _endRow, _endColumn;
findCursorSQL = function(varRow, varColumn) {
    var maxRow = editor.session.getLength();
 	var startRow = -1, endRow = -1;
 	var realCursorPosition = 0;
 	_startRow=0, _startColumn=0, _endRow=0, _endColumn=0;
 	
	//////////////////////////////////////////////////////
	/// 쿼리의 시작과 끝 부분을 계산한다. ////////////////////////
 	//////////////////////////////////////////////////////
 	var currentRow = varRow-1;
 	while(currentRow > 0) {
 		var textTokens = editor.session.getTokens(currentRow).filter(function(t) {
// 			console.log("=[check out tocken]==> [" + t.type + "]:[" + t.value + "]");
 			return t.type === "text";
 		});
	
 		for(var i=0; i<textTokens.length; i++) {
 			if(findDelimiterText(textTokens[i].value)) {
 				startRow = currentRow;
 				break;
 			}
 		}
 		if(startRow >= 0) break;
 		currentRow--;
 	}
 	if(startRow == -1) startRow = 0;

 	// 마지막 분리자(;)까지의 데이터를 찾는다.
 	currentRow = varRow;
 	while(currentRow < maxRow) {
 		var textTokens = editor.session.getTokens(currentRow).filter(function(t) {
 			return t.type === "text";
 		});

 		for(var i=0; i<textTokens.length; i++) {
 			if(findDelimiterText(textTokens[i].value)) {
 				endRow = currentRow;
 				break;
 			}
 		}
 		if(endRow >= 0) break;
 		currentRow++;
 	}
 	if(endRow == -1) endRow = maxRow;
 	
	//////////////////////////////////////////////////////
	/// 쿼리를 만든다. //////////////////////////////////////
 	//////////////////////////////////////////////////////
	
 	// 처음 행을 가져온다.
 	var firstLineQuery = "";
	var isStartDelemiter = false;
 	var tokens = editor.session.getTokens(startRow);
 	for(var i=0; i<tokens.length; i++) {
 		var token = tokens[i];

 		if(token.type === "text" && findDelimiterText(token.value)) {
			isStartDelemiter = true;
 		} else if(isStartDelemiter) {
 			firstLineQuery += token.value;
 		}
 	}
 	
	// 쿼리가 에러일 경우 블록 처리하기 위해 처음 시작 행과 열을 기록한다.
	_startRow = startRow;
			
 	// 처음 행에 분리자가 없는 경우(즉 모든 행 전체가 쿼리인경우)
 	if(isStartDelemiter == false && firstLineQuery == "") {
 		firstLineQuery = editor.session.getLine(startRow) + "\n";
 		_startColumn = 0;
 	// 처음 줄이 ;문자만 있을 경우.
 	} else if(isStartDelemiter == true && firstLineQuery == "") {
 		firstLineQuery = "\n";
 		_startColumn = editor.session.getLine(startRow).length;
 	} else {
 		firstLineQuery += "\n";
 		_startColumn = editor.session.getLine(startRow).length - firstLineQuery.length;
 	}
 	if(isDebug) console.log("==>[Start position]" + _startRow + "." + _startColumn);
 	
 	// 다음행부터 마지막 행까지 가져온다.
 	var middleQuery = "";
 	for(var start = startRow+1; start<endRow; start++) {
 		middleQuery += editor.session.getLine(start) + "\n";
 	}

 	// 마지막 행을 가져온다.
	var lastLineQuery = "";
	var tokens = editor.session.getTokens(endRow);
 	for(var i=0; i<tokens.length; i++) {
 		var token = tokens[i];

 		if(token.type === "text" && findDelimiterText(token.value)) {
 			lastLineQuery += token.value;
			break;
 		} else {
 			lastLineQuery += token.value;
 		}
 	}
 	// 쿼리의 마지막 행과 열을 기록한다.
 	_endRow = endRow, _endColumn = lastLineQuery.length;
 	if(isDebug) console.log("==>[End position]" + _endRow + "." + _endColumn);
 	
	var fullyQuery = firstLineQuery + middleQuery + lastLineQuery + " ";
	if(isDebug) console.log("[fully query][" + firstLineQuery + "][" + middleQuery + "][" + lastLineQuery + "]");

	//////////////////////////////////////////////////////
	/// 쿼리 중에 커서의 위치를 계산한다. ////////////////////////
 	//////////////////////////////////////////////////////
	var realCurrentLine = varRow - startRow;
//	console.log("=0==> realCurrentLine : " + realCurrentLine);
	var arryQuery = fullyQuery.split("\n");
	// 라인 숫자도 포함 시킨다.
	var realCursorPosition = realCurrentLine;
	for(var i=0; i < realCurrentLine; i++) {
//		console.log("=1==> before cursor text is : " + arryQuery[i] + ":" + arryQuery[i].length);
		realCursorPosition += arryQuery[i].length;
	}
//	console.log("==2=> before cursor text is : " + varColumn);
	realCursorPosition += varColumn;//(arryQuery[realCurrentLine].substring(0, varColumn)).length;
//	console.log("[cursor position]" + realCursorPosition);
	
	//////////////////////////////////////////////////////
	/// 결과리턴 ////////////////////////
 	//////////////////////////////////////////////////////
	var arryReturnSQL = [];
	arryReturnSQL.push(fullyQuery);
	arryReturnSQL.push(realCursorPosition);
	return arryReturnSQL;
}

/**
 * 만약에 텍스트에 분리자(;)가 포함되어 있다면 true를 넘긴다.
 * @param currentTxt
 * @returns {Boolean}
 */
findDelimiterText = function(currentTxt) {
	if(currentTxt.indexOf(varDelimiter) > -1) return true;
	else return false;
}

/**
 * 동적으로 키워드르 추가할 수 있는 모드
 */
ace.define("DynHighlightRules", [], function(require, exports, module) {
	var oop = require("ace/lib/oop");
	var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;
	
	var DynHighlightRules = function() {
		this.setKeywords = function(tmpKeywords) {
			this.keywordRule.onMatch = this.createKeywordMapper(tmpKeywords, "identifier");
	   }
	   this.keywordRule = {
	       regex : "\\w+",
	       onMatch : function() {return "text";}
	   }
	
		var keywords;
		var builtinConstants;
		var builtinFunctions;
		var variable;
		
		if(varDBType == 'mysql' || varDBType == 'mariadb') {
			keywords = "alter|and|as|asc|between|count|create|delete|desc|distinct|drop|from|having|in|insert|into|is|join|like|not|on|or|order|select|set|table|union|update|values|where|accessible|action|add|after|algorithm|all|analyze|asensitive|at|authors|auto_increment|autocommit|avg|avg_row_length|before|binary|binlog|both|btree|cache|call|cascade|cascaded|case|catalog_name|chain|change|changed|character|check|checkpoint|checksum|class_origin|client_statistics|close|coalesce|code|collate|collation|collations|column|columns|comment|commit|committed|completion|concurrent|condition|connection|consistent|constraint|contains|continue|contributors|convert|cross|current_date|current_time|current_timestamp|current_user|cursor|data|database|databases|day_hour|day_microsecond|day_minute|day_second|deallocate|dec|declare|default|delay_key_write|delayed|delimiter|des_key_file|describe|deterministic|dev_pop|dev_samp|deviance|directory|disable|discard|distinctrow|div|dual|dumpfile|each|elseif|enable|enclosed|end|ends|engine|engines|enum|errors|escape|escaped|even|event|events|every|execute|exists|exit|explain|extended|fast|fetch|field|fields|first|flush|for|force|foreign|found_rows|full|fulltext|function|general|global|grant|grants|group|groupby_concat|handler|hash|help|high_priority|hosts|hour_microsecond|hour_minute|hour_second|if|ignore|ignore_server_ids|import|index|index_statistics|infile|inner|innodb|inout|insensitive|insert_method|install|interval|invoker|isolation|iterate|key|keys|kill|language|last|leading|leave|left|level|limit|linear|lines|list|load|local|localtime|localtimestamp|lock|logs|low_priority|master|master_heartbeat_period|master_ssl_verify_server_cert|masters|match|max|max_rows|maxvalue|message_text|middleint|migrate|min|min_rows|minute_microsecond|minute_second|mod|mode|modifies|modify|mutex|mysql_errno|natural|next|no|no_write_to_binlog|offline|offset|one|online|open|optimize|option|optionally|out|outer|outfile|pack_keys|parser|partition|partitions|password|phase|plugin|plugins|prepare|preserve|prev|primary|privileges|procedure|processlist|profile|profiles|purge|query|quick|range|read|read_write|reads|real|rebuild|recover|references|regexp|relaylog|release|remove|rename|reorganize|repair|repeatable|replace|require|resignal|restrict|resume|return|returns|revoke|right|rlike|rollback|rollup|row|row_format|rtree|savepoint|schedule|schema|schema_name|schemas|second_microsecond|security|sensitive|separator|serializable|server|session|share|show|signal|slave|slow|smallint|snapshot|soname|spatial|specific|sql|sql_big_result|sql_buffer_result|sql_cache|sql_calc_found_rows|sql_no_cache|sql_small_result|sqlexception|sqlstate|sqlwarning|ssl|start|starting|starts|status|std|stddev|stddev_pop|stddev_samp|storage|straight_join|subclass_origin|sum|suspend|table_name|table_statistics|tables|tablespace|temporary|terminated|to|trailing|transaction|trigger|triggers|truncate|uncommitted|undo|uninstall|unique|unlock|upgrade|usage|use|use_frm|user|user_resources|user_statistics|using|utc_date|utc_time|utc_timestamp|value|variables|varying|view|views|warnings|when|while|with|work|write|xa|xor|year_month|zerofill|begin|do|then|else|loop|repeat";
			builtinConstants = "false|true|null|unknown|date|time|timestamp|ODBCdotTable|zerolessFloat";
			builtinFunctions = "by|bool|boolean|bit|blob|decimal|double|enum|float|long|longblob|longtext|medium|mediumblob|mediumint|mediumtext|time|timestamp|tinyblob|tinyint|tinytext|text|bigint|int|int1|int2|int3|int4|int8|integer|float|float4|float8|double|char|varbinary|varchar|varcharacter|precision|date|datetime|year|unsigned|signed|numeric";
		} else if(varDBType == 'pgsql') {
			keywords = "abort|absolute|abstime|access|aclitem|action|add|admin|after|aggregate|all|also|alter|always|" +
	        "analyse|analyze|and|any|anyarray|anyelement|anyenum|anynonarray|anyrange|array|as|asc|" +
	        "assertion|assignment|asymmetric|at|attribute|authorization|backward|before|begin|between|" +
	        "bigint|binary|bit|bool|boolean|both|box|bpchar|by|bytea|cache|called|cascade|cascaded|case|cast|" +
	        "catalog|chain|char|character|characteristics|check|checkpoint|cid|cidr|circle|class|close|" +
	        "cluster|coalesce|collate|collation|column|comment|comments|commit|committed|concurrently|" +
	        "configuration|connection|constraint|constraints|content|continue|conversion|copy|cost|" +
	        "create|cross|cstring|csv|current|current_catalog|current_date|current_role|" +
	        "current_schema|current_time|current_timestamp|current_user|cursor|cycle|data|database|" +
	        "date|daterange|day|deallocate|dec|decimal|declare|default|defaults|deferrable|deferred|" +
	        "definer|delete|delimiter|delimiters|desc|dictionary|disable|discard|distinct|do|document|" +
	        "domain|double|drop|each|else|enable|encoding|encrypted|end|enum|escape|event|event_trigger|" +
	        "except|exclude|excluding|exclusive|execute|exists|explain|extension|external|extract|false|" +
	        "family|fdw_handler|fetch|first|float|float4|float8|following|for|force|foreign|forward|" +
	        "freeze|from|full|function|functions|global|grant|granted|greatest|group|gtsvector|handler|" +
	        "having|header|hold|hour|identity|if|ilike|immediate|immutable|implicit|in|including|" +
	        "increment|index|indexes|inet|inherit|inherits|initially|inline|inner|inout|input|" +
	        "insensitive|insert|instead|int|int2|int2vector|int4|int4range|int8|int8range|integer|" +
	        "internal|intersect|interval|into|invoker|is|isnull|isolation|join|json|key|label|language|" +
	        "language_handler|large|last|lateral|lc_collate|lc_ctype|leading|leakproof|least|left|level|" +
	        "like|limit|line|listen|load|local|localtime|localtimestamp|location|lock|lseg|macaddr|" +
	        "mapping|match|materialized|maxvalue|minute|minvalue|mode|money|month|move|name|names|" +
	        "national|natural|nchar|next|no|none|not|nothing|notify|notnull|nowait|null|nullif|nulls|" +
	        "numeric|numrange|object|of|off|offset|oid|oids|oidvector|on|only|opaque|operator|option|" +
	        "options|or|order|out|outer|over|overlaps|overlay|owned|owner|parser|partial|partition|passing|" +
	        "password|path|pg_attribute|pg_auth_members|pg_authid|pg_class|pg_database|pg_node_tree|" +
	        "pg_proc|pg_type|placing|plans|point|polygon|position|preceding|precision|prepare|prepared|" +
	        "preserve|primary|prior|privileges|procedural|procedure|program|quote|range|read|real|" +
	        "reassign|recheck|record|recursive|ref|refcursor|references|refresh|regclass|regconfig|" +
	        "regdictionary|regoper|regoperator|regproc|regprocedure|regtype|reindex|relative|release|" +
	        "reltime|rename|repeatable|replace|replica|reset|restart|restrict|returning|returns|revoke|" +
	        "right|role|rollback|row|rows|rule|savepoint|schema|scroll|search|second|security|select|" +
	        "sequence|sequences|serializable|server|session|session_user|set|setof|share|show|similar|" +
	        "simple|smallint|smgr|snapshot|some|stable|standalone|start|statement|statistics|stdin|" +
	        "stdout|storage|strict|strip|substring|symmetric|sysid|system|table|tables|tablespace|temp|" +
	        "template|temporary|text|then|tid|time|timestamp|timestamptz|timetz|tinterval|to|trailing|" +
	        "transaction|treat|trigger|trim|true|truncate|trusted|tsquery|tsrange|tstzrange|tsvector|" +
	        "txid_snapshot|type|types|unbounded|uncommitted|unencrypted|union|unique|unknown|unlisten|" +
	        "unlogged|until|update|user|using|uuid|vacuum|valid|validate|validator|value|values|varbit|" +
	        "varchar|variadic|varying|verbose|version|view|void|volatile|when|where|whitespace|window|" +
	        "with|without|work|wrapper|write|xid|xml|xmlattributes|xmlconcat|xmlelement|xmlexists|" +
	        "xmlforest|xmlparse|xmlpi|xmlroot|xmlserialize|year|yes|zone";
			builtinConstants = "True|False|None|NotImplemented|Ellipsis|__debug__";
			builtinFunctions = "RI_FKey_cascade_del|RI_FKey_cascade_upd|RI_FKey_check_ins|RI_FKey_check_upd|" +
	        "RI_FKey_noaction_del|RI_FKey_noaction_upd|RI_FKey_restrict_del|RI_FKey_restrict_upd|" +
	        "RI_FKey_setdefault_del|RI_FKey_setdefault_upd|RI_FKey_setnull_del|" +
	        "RI_FKey_setnull_upd|abbrev|abs|abstime|abstimeeq|abstimege|abstimegt|abstimein|abstimele|" +
	        "abstimelt|abstimene|abstimeout|abstimerecv|abstimesend|aclcontains|acldefault|" +
	        "aclexplode|aclinsert|aclitemeq|aclitemin|aclitemout|aclremove|acos|age|any_in|any_out|" +
	        "anyarray_in|anyarray_out|anyarray_recv|anyarray_send|anyelement_in|anyelement_out|" +
	        "anyenum_in|anyenum_out|anynonarray_in|anynonarray_out|anyrange_in|anyrange_out|" +
	        "anytextcat|area|areajoinsel|areasel|array_agg|array_agg_finalfn|array_agg_transfn|" +
	        "array_append|array_cat|array_dims|array_eq|array_fill|array_ge|array_gt|array_in|" +
	        "array_larger|array_le|array_length|array_lower|array_lt|array_ndims|array_ne|array_out|" +
	        "array_prepend|array_recv|array_remove|array_replace|array_send|array_smaller|" +
	        "array_to_json|array_to_string|array_typanalyze|array_upper|arraycontained|" +
	        "arraycontains|arraycontjoinsel|arraycontsel|arrayoverlap|ascii|ascii_to_mic|" +
	        "ascii_to_utf8|asin|atan|atan2|avg|big5_to_euc_tw|big5_to_mic|big5_to_utf8|bit_and|bit_in|" +
	        "bit_length|bit_or|bit_out|bit_recv|bit_send|bitand|bitcat|bitcmp|biteq|bitge|bitgt|bitle|" +
	        "bitlt|bitne|bitnot|bitor|bitshiftleft|bitshiftright|bittypmodin|bittypmodout|bitxor|bool|" +
	        "bool_and|bool_or|booland_statefunc|booleq|boolge|boolgt|boolin|boolle|boollt|boolne|" +
	        "boolor_statefunc|boolout|boolrecv|boolsend|box|box_above|box_above_eq|box_add|box_below|" +
	        "box_below_eq|box_center|box_contain|box_contain_pt|box_contained|box_distance|box_div|" +
	        "box_eq|box_ge|box_gt|box_in|box_intersect|box_le|box_left|box_lt|box_mul|box_out|" +
	        "box_overabove|box_overbelow|box_overlap|box_overleft|box_overright|box_recv|box_right|" +
	        "box_same|box_send|box_sub|bpchar_larger|bpchar_pattern_ge|bpchar_pattern_gt|" +
	        "bpchar_pattern_le|bpchar_pattern_lt|bpchar_smaller|bpcharcmp|bpchareq|bpcharge|" +
	        "bpchargt|bpchariclike|bpcharicnlike|bpcharicregexeq|bpcharicregexne|bpcharin|bpcharle|" +
	        "bpcharlike|bpcharlt|bpcharne|bpcharnlike|bpcharout|bpcharrecv|bpcharregexeq|" +
	        "bpcharregexne|bpcharsend|bpchartypmodin|bpchartypmodout|broadcast|btabstimecmp|" +
	        "btarraycmp|btbeginscan|btboolcmp|btbpchar_pattern_cmp|btbuild|btbuildempty|" +
	        "btbulkdelete|btcanreturn|btcharcmp|btcostestimate|btendscan|btfloat48cmp|btfloat4cmp|" +
	        "btfloat4sortsupport|btfloat84cmp|btfloat8cmp|btfloat8sortsupport|btgetbitmap|" +
	        "btgettuple|btinsert|btint24cmp|btint28cmp|btint2cmp|btint2sortsupport|btint42cmp|" +
	        "btint48cmp|btint4cmp|btint4sortsupport|btint82cmp|btint84cmp|btint8cmp|" +
	        "btint8sortsupport|btmarkpos|btnamecmp|btnamesortsupport|btoidcmp|btoidsortsupport|" +
	        "btoidvectorcmp|btoptions|btrecordcmp|btreltimecmp|btrescan|btrestrpos|btrim|" +
	        "bttext_pattern_cmp|bttextcmp|bttidcmp|bttintervalcmp|btvacuumcleanup|" +
	        "bytea_string_agg_finalfn|bytea_string_agg_transfn|byteacat|byteacmp|byteaeq|byteage|" +
	        "byteagt|byteain|byteale|bytealike|bytealt|byteane|byteanlike|byteaout|bytearecv|byteasend|" +
	        "cash_cmp|cash_div_cash|cash_div_flt4|cash_div_flt8|cash_div_int2|cash_div_int4|cash_eq|" +
	        "cash_ge|cash_gt|cash_in|cash_le|cash_lt|cash_mi|cash_mul_flt4|cash_mul_flt8|" +
	        "cash_mul_int2|cash_mul_int4|cash_ne|cash_out|cash_pl|cash_recv|cash_send|cash_words|" +
	        "cashlarger|cashsmaller|cbrt|ceil|ceiling|center|char|char_length|character_length|chareq|" +
	        "charge|chargt|charin|charle|charlt|charne|charout|charrecv|charsend|chr|cideq|cidin|cidout|" +
	        "cidr|cidr_in|cidr_out|cidr_recv|cidr_send|cidrecv|cidsend|circle|circle_above|" +
	        "circle_add_pt|circle_below|circle_center|circle_contain|circle_contain_pt|" +
	        "circle_contained|circle_distance|circle_div_pt|circle_eq|circle_ge|circle_gt|circle_in|" +
	        "circle_le|circle_left|circle_lt|circle_mul_pt|circle_ne|circle_out|circle_overabove|" +
	        "circle_overbelow|circle_overlap|circle_overleft|circle_overright|circle_recv|" +
	        "circle_right|circle_same|circle_send|circle_sub_pt|clock_timestamp|close_lb|close_ls|" +
	        "close_lseg|close_pb|close_pl|close_ps|close_sb|close_sl|col_description|concat|concat_ws|" +
	        "contjoinsel|contsel|convert|convert_from|convert_to|corr|cos|cot|count|covar_pop|" +
	        "covar_samp|cstring_in|cstring_out|cstring_recv|cstring_send|cume_dist|current_database|" +
	        "current_query|current_schema|current_schemas|current_setting|current_user|currtid|" +
	        "currtid2|currval|cursor_to_xml|cursor_to_xmlschema|database_to_xml|" +
	        "database_to_xml_and_xmlschema|database_to_xmlschema|date|date_cmp|date_cmp_timestamp|" +
	        "date_cmp_timestamptz|date_eq|date_eq_timestamp|date_eq_timestamptz|date_ge|" +
	        "date_ge_timestamp|date_ge_timestamptz|date_gt|date_gt_timestamp|date_gt_timestamptz|" +
	        "date_in|date_larger|date_le|date_le_timestamp|date_le_timestamptz|date_lt|" +
	        "date_lt_timestamp|date_lt_timestamptz|date_mi|date_mi_interval|date_mii|date_ne|" +
	        "date_ne_timestamp|date_ne_timestamptz|date_out|date_part|date_pl_interval|date_pli|" +
	        "date_recv|date_send|date_smaller|date_sortsupport|date_trunc|daterange|" +
	        "daterange_canonical|daterange_subdiff|datetime_pl|datetimetz_pl|dcbrt|decode|degrees|" +
	        "dense_rank|dexp|diagonal|diameter|dispell_init|dispell_lexize|dist_cpoly|dist_lb|dist_pb|" +
	        "dist_pc|dist_pl|dist_ppath|dist_ps|dist_sb|dist_sl|div|dlog1|dlog10|domain_in|domain_recv|" +
	        "dpow|dround|dsimple_init|dsimple_lexize|dsnowball_init|dsnowball_lexize|dsqrt|" +
	        "dsynonym_init|dsynonym_lexize|dtrunc|elem_contained_by_range|encode|enum_cmp|enum_eq|" +
	        "enum_first|enum_ge|enum_gt|enum_in|enum_larger|enum_last|enum_le|enum_lt|enum_ne|enum_out|" +
	        "enum_range|enum_recv|enum_send|enum_smaller|eqjoinsel|eqsel|euc_cn_to_mic|" +
	        "euc_cn_to_utf8|euc_jis_2004_to_shift_jis_2004|euc_jis_2004_to_utf8|euc_jp_to_mic|" +
	        "euc_jp_to_sjis|euc_jp_to_utf8|euc_kr_to_mic|euc_kr_to_utf8|euc_tw_to_big5|" +
	        "euc_tw_to_mic|euc_tw_to_utf8|event_trigger_in|event_trigger_out|every|exp|factorial|" +
	        "family|fdw_handler_in|fdw_handler_out|first_value|float4|float48div|float48eq|float48ge|" +
	        "float48gt|float48le|float48lt|float48mi|float48mul|float48ne|float48pl|float4_accum|" +
	        "float4abs|float4div|float4eq|float4ge|float4gt|float4in|float4larger|float4le|float4lt|" +
	        "float4mi|float4mul|float4ne|float4out|float4pl|float4recv|float4send|float4smaller|" +
	        "float4um|float4up|float8|float84div|float84eq|float84ge|float84gt|float84le|float84lt|" +
	        "float84mi|float84mul|float84ne|float84pl|float8_accum|float8_avg|float8_corr|" +
	        "float8_covar_pop|float8_covar_samp|float8_regr_accum|float8_regr_avgx|" +
	        "float8_regr_avgy|float8_regr_intercept|float8_regr_r2|float8_regr_slope|" +
	        "float8_regr_sxx|float8_regr_sxy|float8_regr_syy|float8_stddev_pop|float8_stddev_samp|" +
	        "float8_var_pop|float8_var_samp|float8abs|float8div|float8eq|float8ge|float8gt|float8in|" +
	        "float8larger|float8le|float8lt|float8mi|float8mul|float8ne|float8out|float8pl|float8recv|" +
	        "float8send|float8smaller|float8um|float8up|floor|flt4_mul_cash|flt8_mul_cash|" +
	        "fmgr_c_validator|fmgr_internal_validator|fmgr_sql_validator|format|format_type|" +
	        "gb18030_to_utf8|gbk_to_utf8|generate_series|generate_subscripts|get_bit|get_byte|" +
	        "get_current_ts_config|getdatabaseencoding|getpgusername|gin_cmp_prefix|" +
	        "gin_cmp_tslexeme|gin_extract_tsquery|gin_extract_tsvector|gin_tsquery_consistent|" +
	        "ginarrayconsistent|ginarrayextract|ginbeginscan|ginbuild|ginbuildempty|ginbulkdelete|" +
	        "gincostestimate|ginendscan|gingetbitmap|gininsert|ginmarkpos|ginoptions|" +
	        "ginqueryarrayextract|ginrescan|ginrestrpos|ginvacuumcleanup|gist_box_compress|" +
	        "gist_box_consistent|gist_box_decompress|gist_box_penalty|gist_box_picksplit|" +
	        "gist_box_same|gist_box_union|gist_circle_compress|gist_circle_consistent|" +
	        "gist_point_compress|gist_point_consistent|gist_point_distance|gist_poly_compress|" +
	        "gist_poly_consistent|gistbeginscan|gistbuild|gistbuildempty|gistbulkdelete|" +
	        "gistcostestimate|gistendscan|gistgetbitmap|gistgettuple|gistinsert|gistmarkpos|" +
	        "gistoptions|gistrescan|gistrestrpos|gistvacuumcleanup|gtsquery_compress|" +
	        "gtsquery_consistent|gtsquery_decompress|gtsquery_penalty|gtsquery_picksplit|" +
	        "gtsquery_same|gtsquery_union|gtsvector_compress|gtsvector_consistent|" +
	        "gtsvector_decompress|gtsvector_penalty|gtsvector_picksplit|gtsvector_same|" +
	        "gtsvector_union|gtsvectorin|gtsvectorout|has_any_column_privilege|" +
	        "has_column_privilege|has_database_privilege|has_foreign_data_wrapper_privilege|" +
	        "has_function_privilege|has_language_privilege|has_schema_privilege|" +
	        "has_sequence_privilege|has_server_privilege|has_table_privilege|" +
	        "has_tablespace_privilege|has_type_privilege|hash_aclitem|hash_array|hash_numeric|" +
	        "hash_range|hashbeginscan|hashbpchar|hashbuild|hashbuildempty|hashbulkdelete|hashchar|" +
	        "hashcostestimate|hashendscan|hashenum|hashfloat4|hashfloat8|hashgetbitmap|hashgettuple|" +
	        "hashinet|hashinsert|hashint2|hashint2vector|hashint4|hashint8|hashmacaddr|hashmarkpos|" +
	        "hashname|hashoid|hashoidvector|hashoptions|hashrescan|hashrestrpos|hashtext|" +
	        "hashvacuumcleanup|hashvarlena|height|host|hostmask|iclikejoinsel|iclikesel|" +
	        "icnlikejoinsel|icnlikesel|icregexeqjoinsel|icregexeqsel|icregexnejoinsel|icregexnesel|" +
	        "inet_client_addr|inet_client_port|inet_in|inet_out|inet_recv|inet_send|" +
	        "inet_server_addr|inet_server_port|inetand|inetmi|inetmi_int8|inetnot|inetor|inetpl|" +
	        "initcap|int2|int24div|int24eq|int24ge|int24gt|int24le|int24lt|int24mi|int24mul|int24ne|" +
	        "int24pl|int28div|int28eq|int28ge|int28gt|int28le|int28lt|int28mi|int28mul|int28ne|int28pl|" +
	        "int2_accum|int2_avg_accum|int2_mul_cash|int2_sum|int2abs|int2and|int2div|int2eq|int2ge|" +
	        "int2gt|int2in|int2larger|int2le|int2lt|int2mi|int2mod|int2mul|int2ne|int2not|int2or|int2out|" +
	        "int2pl|int2recv|int2send|int2shl|int2shr|int2smaller|int2um|int2up|int2vectoreq|" +
	        "int2vectorin|int2vectorout|int2vectorrecv|int2vectorsend|int2xor|int4|int42div|int42eq|" +
	        "int42ge|int42gt|int42le|int42lt|int42mi|int42mul|int42ne|int42pl|int48div|int48eq|int48ge|" +
	        "int48gt|int48le|int48lt|int48mi|int48mul|int48ne|int48pl|int4_accum|int4_avg_accum|" +
	        "int4_mul_cash|int4_sum|int4abs|int4and|int4div|int4eq|int4ge|int4gt|int4in|int4inc|" +
	        "int4larger|int4le|int4lt|int4mi|int4mod|int4mul|int4ne|int4not|int4or|int4out|int4pl|" +
	        "int4range|int4range_canonical|int4range_subdiff|int4recv|int4send|int4shl|int4shr|" +
	        "int4smaller|int4um|int4up|int4xor|int8|int82div|int82eq|int82ge|int82gt|int82le|int82lt|" +
	        "int82mi|int82mul|int82ne|int82pl|int84div|int84eq|int84ge|int84gt|int84le|int84lt|int84mi|" +
	        "int84mul|int84ne|int84pl|int8_accum|int8_avg|int8_avg_accum|int8_sum|int8abs|int8and|" +
	        "int8div|int8eq|int8ge|int8gt|int8in|int8inc|int8inc_any|int8inc_float8_float8|int8larger|" +
	        "int8le|int8lt|int8mi|int8mod|int8mul|int8ne|int8not|int8or|int8out|int8pl|int8pl_inet|" +
	        "int8range|int8range_canonical|int8range_subdiff|int8recv|int8send|int8shl|int8shr|" +
	        "int8smaller|int8um|int8up|int8xor|integer_pl_date|inter_lb|inter_sb|inter_sl|internal_in|" +
	        "internal_out|interval_accum|interval_avg|interval_cmp|interval_div|interval_eq|" +
	        "interval_ge|interval_gt|interval_hash|interval_in|interval_larger|interval_le|" +
	        "interval_lt|interval_mi|interval_mul|interval_ne|interval_out|interval_pl|" +
	        "interval_pl_date|interval_pl_time|interval_pl_timestamp|interval_pl_timestamptz|" +
	        "interval_pl_timetz|interval_recv|interval_send|interval_smaller|interval_transform|" +
	        "interval_um|intervaltypmodin|intervaltypmodout|intinterval|isclosed|isempty|isfinite|" +
	        "ishorizontal|iso8859_1_to_utf8|iso8859_to_utf8|iso_to_koi8r|iso_to_mic|iso_to_win1251|" +
	        "iso_to_win866|isopen|isparallel|isperp|isvertical|johab_to_utf8|json_agg|" +
	        "json_agg_finalfn|json_agg_transfn|json_array_element|json_array_element_text|" +
	        "json_array_elements|json_array_length|json_each|json_each_text|json_extract_path|" +
	        "json_extract_path_op|json_extract_path_text|json_extract_path_text_op|json_in|" +
	        "json_object_field|json_object_field_text|json_object_keys|json_out|" +
	        "json_populate_record|json_populate_recordset|json_recv|json_send|justify_days|" +
	        "justify_hours|justify_interval|koi8r_to_iso|koi8r_to_mic|koi8r_to_utf8|" +
	        "koi8r_to_win1251|koi8r_to_win866|koi8u_to_utf8|lag|language_handler_in|" +
	        "language_handler_out|last_value|lastval|latin1_to_mic|latin2_to_mic|latin2_to_win1250|" +
	        "latin3_to_mic|latin4_to_mic|lead|left|length|like|like_escape|likejoinsel|likesel|line|" +
	        "line_distance|line_eq|line_horizontal|line_in|line_interpt|line_intersect|line_out|" +
	        "line_parallel|line_perp|line_recv|line_send|line_vertical|ln|lo_close|lo_creat|lo_create|" +
	        "lo_export|lo_import|lo_lseek|lo_lseek64|lo_open|lo_tell|lo_tell64|lo_truncate|" +
	        "lo_truncate64|lo_unlink|log|loread|lower|lower_inc|lower_inf|lowrite|lpad|lseg|lseg_center|" +
	        "lseg_distance|lseg_eq|lseg_ge|lseg_gt|lseg_horizontal|lseg_in|lseg_interpt|" +
	        "lseg_intersect|lseg_le|lseg_length|lseg_lt|lseg_ne|lseg_out|lseg_parallel|lseg_perp|" +
	        "lseg_recv|lseg_send|lseg_vertical|ltrim|macaddr_and|macaddr_cmp|macaddr_eq|macaddr_ge|" +
	        "macaddr_gt|macaddr_in|macaddr_le|macaddr_lt|macaddr_ne|macaddr_not|macaddr_or|" +
	        "macaddr_out|macaddr_recv|macaddr_send|makeaclitem|masklen|max|md5|mic_to_ascii|" +
	        "mic_to_big5|mic_to_euc_cn|mic_to_euc_jp|mic_to_euc_kr|mic_to_euc_tw|mic_to_iso|" +
	        "mic_to_koi8r|mic_to_latin1|mic_to_latin2|mic_to_latin3|mic_to_latin4|mic_to_sjis|" +
	        "mic_to_win1250|mic_to_win1251|mic_to_win866|min|mktinterval|mod|money|mul_d_interval|" +
	        "name|nameeq|namege|namegt|nameiclike|nameicnlike|nameicregexeq|nameicregexne|namein|" +
	        "namele|namelike|namelt|namene|namenlike|nameout|namerecv|nameregexeq|nameregexne|namesend|" +
	        "neqjoinsel|neqsel|netmask|network|network_cmp|network_eq|network_ge|network_gt|" +
	        "network_le|network_lt|network_ne|network_sub|network_subeq|network_sup|network_supeq|" +
	        "nextval|nlikejoinsel|nlikesel|notlike|now|npoints|nth_value|ntile|numeric_abs|" +
	        "numeric_accum|numeric_add|numeric_avg|numeric_avg_accum|numeric_cmp|numeric_div|" +
	        "numeric_div_trunc|numeric_eq|numeric_exp|numeric_fac|numeric_ge|numeric_gt|numeric_in|" +
	        "numeric_inc|numeric_larger|numeric_le|numeric_ln|numeric_log|numeric_lt|numeric_mod|" +
	        "numeric_mul|numeric_ne|numeric_out|numeric_power|numeric_recv|numeric_send|" +
	        "numeric_smaller|numeric_sqrt|numeric_stddev_pop|numeric_stddev_samp|numeric_sub|" +
	        "numeric_transform|numeric_uminus|numeric_uplus|numeric_var_pop|numeric_var_samp|" +
	        "numerictypmodin|numerictypmodout|numnode|numrange|numrange_subdiff|obj_description|" +
	        "octet_length|oid|oideq|oidge|oidgt|oidin|oidlarger|oidle|oidlt|oidne|oidout|oidrecv|oidsend|" +
	        "oidsmaller|oidvectoreq|oidvectorge|oidvectorgt|oidvectorin|oidvectorle|oidvectorlt|" +
	        "oidvectorne|oidvectorout|oidvectorrecv|oidvectorsend|oidvectortypes|on_pb|on_pl|" +
	        "on_ppath|on_ps|on_sb|on_sl|opaque_in|opaque_out|overlaps|overlay|path|path_add|path_add_pt|" +
	        "path_center|path_contain_pt|path_distance|path_div_pt|path_in|path_inter|path_length|" +
	        "path_mul_pt|path_n_eq|path_n_ge|path_n_gt|path_n_le|path_n_lt|path_npoints|path_out|" +
	        "path_recv|path_send|path_sub_pt|pclose|percent_rank|pg_advisory_lock|" +
	        "pg_advisory_lock_shared|pg_advisory_unlock|pg_advisory_unlock_all|" +
	        "pg_advisory_unlock_shared|pg_advisory_xact_lock|pg_advisory_xact_lock_shared|" +
	        "pg_available_extension_versions|pg_available_extensions|pg_backend_pid|" +
	        "pg_backup_start_time|pg_cancel_backend|pg_char_to_encoding|pg_client_encoding|" +
	        "pg_collation_for|pg_collation_is_visible|pg_column_is_updatable|pg_column_size|" +
	        "pg_conf_load_time|pg_conversion_is_visible|pg_create_restore_point|" +
	        "pg_current_xlog_insert_location|pg_current_xlog_location|pg_cursor|pg_database_size|" +
	        "pg_describe_object|pg_encoding_max_length|pg_encoding_to_char|" +
	        "pg_event_trigger_dropped_objects|pg_export_snapshot|pg_extension_config_dump|" +
	        "pg_extension_update_paths|pg_function_is_visible|pg_get_constraintdef|pg_get_expr|" +
	        "pg_get_function_arguments|pg_get_function_identity_arguments|" +
	        "pg_get_function_result|pg_get_functiondef|pg_get_indexdef|pg_get_keywords|" +
	        "pg_get_multixact_members|pg_get_ruledef|pg_get_serial_sequence|pg_get_triggerdef|" +
	        "pg_get_userbyid|pg_get_viewdef|pg_has_role|pg_identify_object|pg_indexes_size|" +
	        "pg_is_in_backup|pg_is_in_recovery|pg_is_other_temp_schema|pg_is_xlog_replay_paused|" +
	        "pg_last_xact_replay_timestamp|pg_last_xlog_receive_location|" +
	        "pg_last_xlog_replay_location|pg_listening_channels|pg_lock_status|pg_ls_dir|" +
	        "pg_my_temp_schema|pg_node_tree_in|pg_node_tree_out|pg_node_tree_recv|" +
	        "pg_node_tree_send|pg_notify|pg_opclass_is_visible|pg_operator_is_visible|" +
	        "pg_opfamily_is_visible|pg_options_to_table|pg_postmaster_start_time|" +
	        "pg_prepared_statement|pg_prepared_xact|pg_read_binary_file|pg_read_file|" +
	        "pg_relation_filenode|pg_relation_filepath|pg_relation_is_updatable|pg_relation_size|" +
	        "pg_reload_conf|pg_rotate_logfile|pg_sequence_parameters|pg_show_all_settings|" +
	        "pg_size_pretty|pg_sleep|pg_start_backup|pg_stat_clear_snapshot|pg_stat_file|" +
	        "pg_stat_get_activity|pg_stat_get_analyze_count|pg_stat_get_autoanalyze_count|" +
	        "pg_stat_get_autovacuum_count|pg_stat_get_backend_activity|" +
	        "pg_stat_get_backend_activity_start|pg_stat_get_backend_client_addr|" +
	        "pg_stat_get_backend_client_port|pg_stat_get_backend_dbid|pg_stat_get_backend_idset|" +
	        "pg_stat_get_backend_pid|pg_stat_get_backend_start|pg_stat_get_backend_userid|" +
	        "pg_stat_get_backend_waiting|pg_stat_get_backend_xact_start|" +
	        "pg_stat_get_bgwriter_buf_written_checkpoints|" +
	        "pg_stat_get_bgwriter_buf_written_clean|pg_stat_get_bgwriter_maxwritten_clean|" +
	        "pg_stat_get_bgwriter_requested_checkpoints|pg_stat_get_bgwriter_stat_reset_time|" +
	        "pg_stat_get_bgwriter_timed_checkpoints|pg_stat_get_blocks_fetched|" +
	        "pg_stat_get_blocks_hit|pg_stat_get_buf_alloc|pg_stat_get_buf_fsync_backend|" +
	        "pg_stat_get_buf_written_backend|pg_stat_get_checkpoint_sync_time|" +
	        "pg_stat_get_checkpoint_write_time|pg_stat_get_db_blk_read_time|" +
	        "pg_stat_get_db_blk_write_time|pg_stat_get_db_blocks_fetched|" +
	        "pg_stat_get_db_blocks_hit|pg_stat_get_db_conflict_all|" +
	        "pg_stat_get_db_conflict_bufferpin|pg_stat_get_db_conflict_lock|" +
	        "pg_stat_get_db_conflict_snapshot|pg_stat_get_db_conflict_startup_deadlock|" +
	        "pg_stat_get_db_conflict_tablespace|pg_stat_get_db_deadlocks|" +
	        "pg_stat_get_db_numbackends|pg_stat_get_db_stat_reset_time|" +
	        "pg_stat_get_db_temp_bytes|pg_stat_get_db_temp_files|pg_stat_get_db_tuples_deleted|" +
	        "pg_stat_get_db_tuples_fetched|pg_stat_get_db_tuples_inserted|" +
	        "pg_stat_get_db_tuples_returned|pg_stat_get_db_tuples_updated|" +
	        "pg_stat_get_db_xact_commit|pg_stat_get_db_xact_rollback|pg_stat_get_dead_tuples|" +
	        "pg_stat_get_function_calls|pg_stat_get_function_self_time|" +
	        "pg_stat_get_function_total_time|pg_stat_get_last_analyze_time|" +
	        "pg_stat_get_last_autoanalyze_time|pg_stat_get_last_autovacuum_time|" +
	        "pg_stat_get_last_vacuum_time|pg_stat_get_live_tuples|pg_stat_get_numscans|" +
	        "pg_stat_get_tuples_deleted|pg_stat_get_tuples_fetched|" +
	        "pg_stat_get_tuples_hot_updated|pg_stat_get_tuples_inserted|" +
	        "pg_stat_get_tuples_returned|pg_stat_get_tuples_updated|pg_stat_get_vacuum_count|" +
	        "pg_stat_get_wal_senders|pg_stat_get_xact_blocks_fetched|" +
	        "pg_stat_get_xact_blocks_hit|pg_stat_get_xact_function_calls|" +
	        "pg_stat_get_xact_function_self_time|pg_stat_get_xact_function_total_time|" +
	        "pg_stat_get_xact_numscans|pg_stat_get_xact_tuples_deleted|" +
	        "pg_stat_get_xact_tuples_fetched|pg_stat_get_xact_tuples_hot_updated|" +
	        "pg_stat_get_xact_tuples_inserted|pg_stat_get_xact_tuples_returned|" +
	        "pg_stat_get_xact_tuples_updated|pg_stat_reset|pg_stat_reset_shared|" +
	        "pg_stat_reset_single_function_counters|pg_stat_reset_single_table_counters|" +
	        "pg_stop_backup|pg_switch_xlog|pg_table_is_visible|pg_table_size|" +
	        "pg_tablespace_databases|pg_tablespace_location|pg_tablespace_size|" +
	        "pg_terminate_backend|pg_timezone_abbrevs|pg_timezone_names|pg_total_relation_size|" +
	        "pg_trigger_depth|pg_try_advisory_lock|pg_try_advisory_lock_shared|" +
	        "pg_try_advisory_xact_lock|pg_try_advisory_xact_lock_shared|pg_ts_config_is_visible|" +
	        "pg_ts_dict_is_visible|pg_ts_parser_is_visible|pg_ts_template_is_visible|" +
	        "pg_type_is_visible|pg_typeof|pg_xlog_location_diff|pg_xlog_replay_pause|" +
	        "pg_xlog_replay_resume|pg_xlogfile_name|pg_xlogfile_name_offset|pi|plainto_tsquery|" +
	        "plpgsql_call_handler|plpgsql_inline_handler|plpgsql_validator|point|point_above|" +
	        "point_add|point_below|point_distance|point_div|point_eq|point_horiz|point_in|point_left|" +
	        "point_mul|point_ne|point_out|point_recv|point_right|point_send|point_sub|point_vert|" +
	        "poly_above|poly_below|poly_center|poly_contain|poly_contain_pt|poly_contained|" +
	        "poly_distance|poly_in|poly_left|poly_npoints|poly_out|poly_overabove|poly_overbelow|" +
	        "poly_overlap|poly_overleft|poly_overright|poly_recv|poly_right|poly_same|poly_send|" +
	        "polygon|popen|position|positionjoinsel|positionsel|postgresql_fdw_validator|pow|power|" +
	        "prsd_end|prsd_headline|prsd_lextype|prsd_nexttoken|prsd_start|pt_contained_circle|" +
	        "pt_contained_poly|query_to_xml|query_to_xml_and_xmlschema|query_to_xmlschema|" +
	        "querytree|quote_ident|quote_literal|quote_nullable|radians|radius|random|range_adjacent|" +
	        "range_after|range_before|range_cmp|range_contained_by|range_contains|" +
	        "range_contains_elem|range_eq|range_ge|range_gist_compress|range_gist_consistent|" +
	        "range_gist_decompress|range_gist_penalty|range_gist_picksplit|range_gist_same|" +
	        "range_gist_union|range_gt|range_in|range_intersect|range_le|range_lt|range_minus|" +
	        "range_ne|range_out|range_overlaps|range_overleft|range_overright|range_recv|range_send|" +
	        "range_typanalyze|range_union|rangesel|rank|record_eq|record_ge|record_gt|record_in|" +
	        "record_le|record_lt|record_ne|record_out|record_recv|record_send|regclass|regclassin|" +
	        "regclassout|regclassrecv|regclasssend|regconfigin|regconfigout|regconfigrecv|" +
	        "regconfigsend|regdictionaryin|regdictionaryout|regdictionaryrecv|regdictionarysend|" +
	        "regexeqjoinsel|regexeqsel|regexnejoinsel|regexnesel|regexp_matches|regexp_replace|" +
	        "regexp_split_to_array|regexp_split_to_table|regoperatorin|regoperatorout|" +
	        "regoperatorrecv|regoperatorsend|regoperin|regoperout|regoperrecv|regopersend|" +
	        "regprocedurein|regprocedureout|regprocedurerecv|regproceduresend|regprocin|regprocout|" +
	        "regprocrecv|regprocsend|regr_avgx|regr_avgy|regr_count|regr_intercept|regr_r2|" +
	        "regr_slope|regr_sxx|regr_sxy|regr_syy|regtypein|regtypeout|regtyperecv|regtypesend|" +
	        "reltime|reltimeeq|reltimege|reltimegt|reltimein|reltimele|reltimelt|reltimene|reltimeout|" +
	        "reltimerecv|reltimesend|repeat|replace|reverse|right|round|row_number|row_to_json|rpad|" +
	        "rtrim|scalargtjoinsel|scalargtsel|scalarltjoinsel|scalarltsel|schema_to_xml|" +
	        "schema_to_xml_and_xmlschema|schema_to_xmlschema|session_user|set_bit|set_byte|" +
	        "set_config|set_masklen|setseed|setval|setweight|shell_in|shell_out|" +
	        "shift_jis_2004_to_euc_jis_2004|shift_jis_2004_to_utf8|shobj_description|sign|" +
	        "similar_escape|sin|sjis_to_euc_jp|sjis_to_mic|sjis_to_utf8|slope|smgreq|smgrin|smgrne|" +
	        "smgrout|spg_kd_choose|spg_kd_config|spg_kd_inner_consistent|spg_kd_picksplit|" +
	        "spg_quad_choose|spg_quad_config|spg_quad_inner_consistent|spg_quad_leaf_consistent|" +
	        "spg_quad_picksplit|spg_range_quad_choose|spg_range_quad_config|" +
	        "spg_range_quad_inner_consistent|spg_range_quad_leaf_consistent|" +
	        "spg_range_quad_picksplit|spg_text_choose|spg_text_config|spg_text_inner_consistent|" +
	        "spg_text_leaf_consistent|spg_text_picksplit|spgbeginscan|spgbuild|spgbuildempty|" +
	        "spgbulkdelete|spgcanreturn|spgcostestimate|spgendscan|spggetbitmap|spggettuple|" +
	        "spginsert|spgmarkpos|spgoptions|spgrescan|spgrestrpos|spgvacuumcleanup|split_part|sqrt|" +
	        "statement_timestamp|stddev|stddev_pop|stddev_samp|string_agg|string_agg_finalfn|" +
	        "string_agg_transfn|string_to_array|strip|strpos|substr|substring|sum|" +
	        "suppress_redundant_updates_trigger|table_to_xml|table_to_xml_and_xmlschema|" +
	        "table_to_xmlschema|tan|text|text_ge|text_gt|text_larger|text_le|text_lt|text_pattern_ge|" +
	        "text_pattern_gt|text_pattern_le|text_pattern_lt|text_smaller|textanycat|textcat|texteq|" +
	        "texticlike|texticnlike|texticregexeq|texticregexne|textin|textlen|textlike|textne|" +
	        "textnlike|textout|textrecv|textregexeq|textregexne|textsend|thesaurus_init|" +
	        "thesaurus_lexize|tideq|tidge|tidgt|tidin|tidlarger|tidle|tidlt|tidne|tidout|tidrecv|tidsend|" +
	        "tidsmaller|time_cmp|time_eq|time_ge|time_gt|time_hash|time_in|time_larger|time_le|time_lt|" +
	        "time_mi_interval|time_mi_time|time_ne|time_out|time_pl_interval|time_recv|time_send|" +
	        "time_smaller|time_transform|timedate_pl|timemi|timenow|timeofday|timepl|timestamp_cmp|" +
	        "timestamp_cmp_date|timestamp_cmp_timestamptz|timestamp_eq|timestamp_eq_date|" +
	        "timestamp_eq_timestamptz|timestamp_ge|timestamp_ge_date|timestamp_ge_timestamptz|" +
	        "timestamp_gt|timestamp_gt_date|timestamp_gt_timestamptz|timestamp_hash|timestamp_in|" +
	        "timestamp_larger|timestamp_le|timestamp_le_date|timestamp_le_timestamptz|" +
	        "timestamp_lt|timestamp_lt_date|timestamp_lt_timestamptz|timestamp_mi|" +
	        "timestamp_mi_interval|timestamp_ne|timestamp_ne_date|timestamp_ne_timestamptz|" +
	        "timestamp_out|timestamp_pl_interval|timestamp_recv|timestamp_send|timestamp_smaller|" +
	        "timestamp_sortsupport|timestamp_transform|timestamptypmodin|timestamptypmodout|" +
	        "timestamptz_cmp|timestamptz_cmp_date|timestamptz_cmp_timestamp|timestamptz_eq|" +
	        "timestamptz_eq_date|timestamptz_eq_timestamp|timestamptz_ge|timestamptz_ge_date|" +
	        "timestamptz_ge_timestamp|timestamptz_gt|timestamptz_gt_date|" +
	        "timestamptz_gt_timestamp|timestamptz_in|timestamptz_larger|timestamptz_le|" +
	        "timestamptz_le_date|timestamptz_le_timestamp|timestamptz_lt|timestamptz_lt_date|" +
	        "timestamptz_lt_timestamp|timestamptz_mi|timestamptz_mi_interval|timestamptz_ne|" +
	        "timestamptz_ne_date|timestamptz_ne_timestamp|timestamptz_out|" +
	        "timestamptz_pl_interval|timestamptz_recv|timestamptz_send|timestamptz_smaller|" +
	        "timestamptztypmodin|timestamptztypmodout|timetypmodin|timetypmodout|timetz_cmp|" +
	        "timetz_eq|timetz_ge|timetz_gt|timetz_hash|timetz_in|timetz_larger|timetz_le|timetz_lt|" +
	        "timetz_mi_interval|timetz_ne|timetz_out|timetz_pl_interval|timetz_recv|timetz_send|" +
	        "timetz_smaller|timetzdate_pl|timetztypmodin|timetztypmodout|timezone|tinterval|" +
	        "tintervalct|tintervalend|tintervaleq|tintervalge|tintervalgt|tintervalin|tintervalle|" +
	        "tintervalleneq|tintervallenge|tintervallengt|tintervallenle|tintervallenlt|" +
	        "tintervallenne|tintervallt|tintervalne|tintervalout|tintervalov|tintervalrecv|" +
	        "tintervalrel|tintervalsame|tintervalsend|tintervalstart|to_ascii|to_char|to_date|to_hex|" +
	        "to_json|to_number|to_timestamp|to_tsquery|to_tsvector|transaction_timestamp|translate|" +
	        "trigger_in|trigger_out|trunc|ts_debug|ts_headline|ts_lexize|ts_match_qv|ts_match_tq|" +
	        "ts_match_tt|ts_match_vq|ts_parse|ts_rank|ts_rank_cd|ts_rewrite|ts_stat|ts_token_type|" +
	        "ts_typanalyze|tsmatchjoinsel|tsmatchsel|tsq_mcontained|tsq_mcontains|tsquery_and|" +
	        "tsquery_cmp|tsquery_eq|tsquery_ge|tsquery_gt|tsquery_le|tsquery_lt|tsquery_ne|" +
	        "tsquery_not|tsquery_or|tsqueryin|tsqueryout|tsqueryrecv|tsquerysend|tsrange|" +
	        "tsrange_subdiff|tstzrange|tstzrange_subdiff|tsvector_cmp|tsvector_concat|tsvector_eq|" +
	        "tsvector_ge|tsvector_gt|tsvector_le|tsvector_lt|tsvector_ne|tsvector_update_trigger|" +
	        "tsvector_update_trigger_column|tsvectorin|tsvectorout|tsvectorrecv|tsvectorsend|" +
	        "txid_current|txid_current_snapshot|txid_snapshot_in|txid_snapshot_out|" +
	        "txid_snapshot_recv|txid_snapshot_send|txid_snapshot_xip|txid_snapshot_xmax|" +
	        "txid_snapshot_xmin|txid_visible_in_snapshot|uhc_to_utf8|unique_key_recheck|unknownin|" +
	        "unknownout|unknownrecv|unknownsend|unnest|upper|upper_inc|upper_inf|utf8_to_ascii|" +
	        "utf8_to_big5|utf8_to_euc_cn|utf8_to_euc_jis_2004|utf8_to_euc_jp|utf8_to_euc_kr|" +
	        "utf8_to_euc_tw|utf8_to_gb18030|utf8_to_gbk|utf8_to_iso8859|utf8_to_iso8859_1|" +
	        "utf8_to_johab|utf8_to_koi8r|utf8_to_koi8u|utf8_to_shift_jis_2004|utf8_to_sjis|" +
	        "utf8_to_uhc|utf8_to_win|uuid_cmp|uuid_eq|uuid_ge|uuid_gt|uuid_hash|uuid_in|uuid_le|" +
	        "uuid_lt|uuid_ne|uuid_out|uuid_recv|uuid_send|var_pop|var_samp|varbit_in|varbit_out|" +
	        "varbit_recv|varbit_send|varbit_transform|varbitcmp|varbiteq|varbitge|varbitgt|varbitle|" +
	        "varbitlt|varbitne|varbittypmodin|varbittypmodout|varchar_transform|varcharin|" +
	        "varcharout|varcharrecv|varcharsend|varchartypmodin|varchartypmodout|variance|version|" +
	        "void_in|void_out|void_recv|void_send|width|width_bucket|win1250_to_latin2|" +
	        "win1250_to_mic|win1251_to_iso|win1251_to_koi8r|win1251_to_mic|win1251_to_win866|" +
	        "win866_to_iso|win866_to_koi8r|win866_to_mic|win866_to_win1251|win_to_utf8|xideq|" +
	        "xideqint4|xidin|xidout|xidrecv|xidsend|xml|xml_in|xml_is_well_formed|" +
	        "xml_is_well_formed_content|xml_is_well_formed_document|xml_out|xml_recv|xml_send|" +
	        "xmlagg|xmlcomment|xmlconcat2|xmlexists|xmlvalidate|xpath|xpath_exists";
		} else if(varDBType == 'mssql') {
			keywords = "ABSOLUTE|ACTION|ADA|ADD|ADMIN|AFTER|AGGREGATE|ALIAS|ALL|ALLOCATE|ALTER|AND|ANY|ARE|ARRAY|AS|ASC|ASENSITIVE|ASSERTION|ASYMMETRIC|AT|ATOMIC|AUTHORIZATION|BACKUP|BEFORE|BEGIN|BETWEEN|BIT_LENGTH|BLOB|BOOLEAN|BOTH|BREADTH|BREAK|BROWSE|BULK|BY|CALL|CALLED|CARDINALITY|CASCADE|CASCADED|CASE|CATALOG|CHARACTER|CHARACTER_LENGTH|CHAR_LENGTH|CHECK|CHECKPOINT|CLASS|CLOB|CLOSE|CLUSTERED|COALESCE|COLLATE|COLLATION|COLLECT|COLUMN|COMMIT|COMPLETION|COMPUTE|CONDITION|CONNECT|CONNECTION|CONSTRAINT|CONSTRAINTS|CONSTRUCTOR|CONTAINS|CONTAINSTABLE|CONTINUE|CORR|CORRESPONDING|COVAR_POP|COVAR_SAMP|CREATE|CROSS|CUBE|CUME_DIST|CURRENT|CURRENT_CATALOG|CURRENT_DATE|CURRENT_DEFAULT_TRANSFORM_GROUP|CURRENT_PATH|CURRENT_ROLE|CURRENT_SCHEMA|CURRENT_TIME|CURRENT_TRANSFORM_GROUP_FOR_TYPE|CYCLE|DATA|DATABASE|DBCC|DEALLOCATE|DEC|DECLARE|DEFAULT|DEFERRABLE|DEFERRED|DELETE|DENY|DEPTH|DEREF|DESC|DESCRIBE|DESCRIPTOR|DESTROY|DESTRUCTOR|DETERMINISTIC|DIAGNOSTICS|DICTIONARY|DISCONNECT|DISK|DISTINCT|DISTRIBUTED|DOMAIN|DOUBLE|DROP|DUMP|DYNAMIC|EACH|ELEMENT|ELSE|END|END-EXEC|EQUALS|ERRLVL|ESCAPE|EVERY|EXCEPT|EXCEPTION|EXEC|EXECUTE|EXISTS|EXIT|EXTERNAL|EXTRACT|FETCH|FILE|FILLFACTOR|FILTER|FIRST|FOR|FOREIGN|FORTRAN|FOUND|FREE|FREETEXT|FREETEXTTABLE|FROM|FULL|FULLTEXTTABLE|FUNCTION|FUSION|GENERAL|GET|GLOBAL|GO|GOTO|GRANT|GROUP|HAVING|HOLD|HOLDLOCK|HOST|HOUR|IDENTITY|IDENTITYCOL|IDENTITY_INSERT|IF|IGNORE|IMMEDIATE|IN|INCLUDE|INDEX|INDICATOR|INITIALIZE|INITIALLY|INNER|INOUT|INPUT|INSENSITIVE|INSERT|INTEGER|INTERSECT|INTERSECTION|INTERVAL|INTO|IS|ISOLATION|ITERATE|JOIN|KEY|KILL|LANGUAGE|LARGE|LAST|LATERAL|LEADING|LESS|LEVEL|LIKE|LIKE_REGEX|LIMIT|LINENO|LN|LOAD|LOCAL|LOCALTIME|LOCALTIMESTAMP|LOCATOR|MAP|MATCH|MEMBER|MERGE|METHOD|MINUTE|MOD|MODIFIES|MODIFY|MODULE|MULTISET|NAMES|NATIONAL|NATURAL|NCLOB|NEW|NEXT|NO|NOCHECK|NONCLUSTERED|NONE|NORMALIZE|NOT|NULL|NULLIF|OBJECT|OCCURRENCES_REGEX|OCTET_LENGTH|OF|OFF|OFFSETS|OLD|ON|ONLY|OPEN|OPERATION|OPTION|OR|ORDER|ORDINALITY|OUT|OUTER|OUTPUT|OVER|OVERLAPS|OVERLAY|PAD|PARAMETER|PARAMETERS|PARTIAL|PARTITION|PASCAL|PATH|PERCENT|PERCENTILE_CONT|PERCENTILE_DISC|PERCENT_RANK|PIVOT|PLAN|POSITION|POSITION_REGEX|POSTFIX|PRECISION|PREFIX|PREORDER|PREPARE|PRESERVE|PRIMARY|PRINT|PRIOR|PRIVILEGES|PROC|PROCEDURE|PUBLIC|RAISERROR|RANGE|READ|READS|READTEXT|RECONFIGURE|RECURSIVE|REF|REFERENCES|REFERENCING|REGR_AVGX|REGR_AVGY|REGR_COUNT|REGR_INTERCEPT|REGR_R2|REGR_SLOPE|REGR_SXX|REGR_SXY|REGR_SYY|RELATIVE|RELEASE|REPLICATION|RESTORE|RESTRICT|RESULT|RETURN|RETURNS|REVERT|REVOKE|ROLE|ROLLBACK|ROLLUP|ROUTINE|ROW|ROWCOUNT|ROWGUIDCOL|ROWS|RULE|SAVE|SAVEPOINT|SCHEMA|SCOPE|SCROLL|SEARCH|SECOND|SECTION|SECURITYAUDIT|SELECT|SEMANTICKEYPHRASETABLE|SEMANTICSIMILARITYDETAILSTABLE|SEMANTICSIMILARITYTABLE|SENSITIVE|SEQUENCE|SESSION|SET|SETS|SETUSER|SHUTDOWN|SIMILAR|SIZE|SOME|SPECIFIC|SPECIFICTYPE|SQL|SQLCA|SQLCODE|SQLERROR|SQLEXCEPTION|SQLSTATE|SQLWARNING|START|STATE|STATEMENT|STATIC|STATISTICS|STDDEV_POP|STDDEV_SAMP|STRUCTURE|SUBMULTISET|SUBSTRING_REGEX|SYMMETRIC|SYSTEM|TABLESAMPLE|TEMPORARY|TERMINATE|TEXTSIZE|THAN|THEN|TIMEZONE_HOUR|TIMEZONE_MINUTE|TO|TOP|TRAILING|TRAN|TRANSACTION|TRANSLATE|TRANSLATE_REGEX|TRANSLATION|TREAT|TRIGGER|TRIM|TRUNCATE|TSEQUAL|UESCAPE|UNDER|UNION|UNIQUE|UNKNOWN|UNNEST|UNPIVOT|UPDATE|UPDATETEXT|USAGE|USE|USER|USING|VALUE|VALUES|VARIABLE|VARYING|VAR_POP|VAR_SAMP|VIEW|WAITFOR|WHEN|WHENEVER|WHERE|WHILE|WIDTH_BUCKET|WINDOW|WITH|WITHIN|WITHIN GROUP|WITHOUT|WORK|WRITE|WRITETEXT|XMLAGG|XMLATTRIBUTES|XMLBINARY|XMLCAST|XMLCOMMENT|XMLCONCAT|XMLDOCUMENT|XMLELEMENT|XMLEXISTS|XMLFOREST|XMLITERATE|XMLNAMESPACES|XMLPARSE|XMLPI|XMLQUERY|XMLSERIALIZE|XMLTABLE|XMLTEXT|XMLVALIDATE|ZONE" +
					    "|KEEPIDENTITY|KEEPDEFAULTS|IGNORE_CONSTRAINTS|IGNORE_TRIGGERS|XLOCK|FORCESCAN|FORCESEEK|HOLDLOCK|NOLOCK|NOWAIT|PAGLOCK|READCOMMITTED|READCOMMITTEDLOCK|READPAST|READUNCOMMITTED|REPEATABLEREAD|ROWLOCK|SERIALIZABLE|SNAPSHOT|SPATIAL_WINDOW_MAX_CELLS|TABLOCK|TABLOCKX|UPDLOCK|XLOCK|IGNORE_NONCLUSTERED_COLUMNSTORE_INDEX|EXPAND|VIEWS|FAST|FORCE|KEEP|KEEPFIXED|MAXDOP|MAXRECURSION|OPTIMIZE|PARAMETERIZATION|SIMPLE|FORCED|RECOMPILE|ROBUST|PLAN|SPATIAL_WINDOW_MAX_CELLS|NOEXPAND|HINT" +
					    "|LOOP|HASH|MERGE|REMOTE" +
					    "|TRY|CATCH|THROW" +
					    "|TYPE";
			builtinConstants = "ALL|AND|ANY|BETWEEN|EXISTS|IN|LIKE|NOT|OR|SOME" +
		    					"|NULL|IS|APPLY|INNER|OUTER|LEFT|RIGHT|JOIN|CROSS";
			builtinFunctions = "OPENDATASOURCE|OPENQUERY|OPENROWSET|OPENXML|" +
			    "AVG|CHECKSUM_AGG|COUNT|COUNT_BIG|GROUPING|GROUPING_ID|MAX|MIN|STDEV|STDEVP|SUM|VAR|VARP|" +
			    "DENSE_RANK|NTILE|RANK|ROW_NUMBER" +
			    "@@DATEFIRST|@@DBTS|@@LANGID|@@LANGUAGE|@@LOCK_TIMEOUT|@@MAX_CONNECTIONS|@@MAX_PRECISION|@@NESTLEVEL|@@OPTIONS|@@REMSERVER|@@SERVERNAME|@@SERVICENAME|@@SPID|@@TEXTSIZE|@@VERSION|" +
			    "CAST|CONVERT|PARSE|TRY_CAST|TRY_CONVERT|TRY_PARSE" +
			    "@@CURSOR_ROWS|@@FETCH_STATUS|CURSOR_STATUS|" +
			    "@@DATEFIRST|@@LANGUAGE|CURRENT_TIMESTAMP|DATEADD|DATEDIFF|DATEFROMPARTS|DATENAME|DATEPART|DATETIME2FROMPARTS|DATETIMEFROMPARTS|DATETIMEOFFSETFROMPARTS|DAY|EOMONTH|GETDATE|GETUTCDATE|ISDATE|MONTH|SET DATEFIRST|SET DATEFORMAT|SET LANGUAGE|SMALLDATETIMEFROMPARTS|SP_HELPLANGUAGE|SWITCHOFFSET|SYSDATETIME|SYSDATETIMEOFFSET|SYSUTCDATETIME|TIMEFROMPARTS|TODATETIMEOFFSET|YEAR|" +
			    "CHOOSE|IIF|" +
			    "ABS|ACOS|ASIN|ATAN|ATN2|CEILING|COS|COT|DEGREES|EXP|FLOOR|LOG|LOG10|PI|POWER|RADIANS|RAND|ROUND|SIGN|SIN|SQRT|SQUARE|TAN|" +
			    "@@PROCID|APPLOCK_MODE|APPLOCK_TEST|APP_NAME|ASSEMBLYPROPERTY|COLUMNPROPERTY|COL_LENGTH|COL_NAME|DATABASEPROPERTYEX|DATABASE_PRINCIPAL_ID|DB_ID|DB_NAME|FILEGROUPPROPERTY|FILEGROUP_ID|FILEGROUP_NAME|FILEPROPERTY|FILE_ID|FILE_IDEX|FILE_NAME|FULLTEXTCATALOGPROPERTY|FULLTEXTSERVICEPROPERTY|INDEXKEY_PROPERTY|INDEXPROPERTY|INDEX_COL|OBJECTPROPERTY|OBJECTPROPERTYEX|OBJECT_DEFINITION|OBJECT_ID|OBJECT_NAME|OBJECT_SCHEMA_NAME|ORIGINAL_DB_NAME|PARSENAME|SCHEMA_ID|SCHEMA_NAME|SCOPE_IDENTITY|SERVERPROPERTY|STATS_DATE|TYPEPROPERTY|TYPE_ID|TYPE_NAME|" +
			    "CERTENCODED|CERTPRIVATEKEY|CURRENT_USER|DATABASE_PRINCIPAL_ID|HAS_PERMS_BY_NAME|IS_MEMBER|IS_ROLEMEMBER|IS_SRVROLEMEMBER|ORIGINAL_LOGIN|PERMISSIONS|PWDCOMPARE|PWDENCRYPT|SCHEMA_ID|SCHEMA_NAME|SESSION_USER|SUSER_ID|SUSER_NAME|SUSER_SID|SUSER_SNAME|SYS.FN_BUILTIN_PERMISSIONS|SYS.FN_GET_AUDIT_FILE|SYS.FN_MY_PERMISSIONS|SYSTEM_USER|USER_ID|USER_NAME|" +
			    "ASCII|CHAR|CHARINDEX|CONCAT|DIFFERENCE|FORMAT|LEN|LOWER|LTRIM|NCHAR|PATINDEX|QUOTENAME|REPLACE|REPLICATE|REVERSE|RTRIM|SOUNDEX|SPACE|STR|STUFF|SUBSTRING|UNICODE|UPPER|" +
			    "$PARTITION|@@ERROR|@@IDENTITY|@@PACK_RECEIVED|@@ROWCOUNT|@@TRANCOUNT|BINARY_CHECKSUM|CHECKSUM|CONNECTIONPROPERTY|CONTEXT_INFO|CURRENT_REQUEST_ID|ERROR_LINE|ERROR_MESSAGE|ERROR_NUMBER|ERROR_PROCEDURE|ERROR_SEVERITY|ERROR_STATE|FORMATMESSAGE|GETANSINULL|GET_FILESTREAM_TRANSACTION_CONTEXT|HOST_ID|HOST_NAME|ISNULL|ISNUMERIC|MIN_ACTIVE_ROWVERSION|NEWID|NEWSEQUENTIALID|ROWCOUNT_BIG|XACT_STATE|" +
			    "@@CONNECTIONS|@@CPU_BUSY|@@IDLE|@@IO_BUSY|@@PACKET_ERRORS|@@PACK_RECEIVED|@@PACK_SENT|@@TIMETICKS|@@TOTAL_ERRORS|@@TOTAL_READ|@@TOTAL_WRITE|FN_VIRTUALFILESTATS|" +
			    "PATINDEX|TEXTPTR|TEXTVALID|" +
			    "COALESCE|NULLIF";
		} else if(varDBType == 'sqlite') {
			keywords = "abort|abs|action|add|after|all|alter|analyze|and|as|asc|attach|autoincrement|avg|before|begin|between|by|cascade|case|cast|check|collate|column|count|commit|conflict|constraint|create|cross|current_date|current_time|current_timestamp|database|default|deferrable|deferred|delete|desc|detach|distinct|drop|each|else|end|escape|except|exclusive|exists|explain|fail|for|foreign|from|full|glob|group|having|if|ignore|immediate|in|index|indexed|initially|inner|insert|instead|intersect|into|is|isnull|join|key|left|like|limit|lower|match|max|min|natural|no|not|notnull|null|of|offset|on|or|order|outer|plan|pragma|primary|query|raise|random|recursive|references|regexp|reindex|release|rename|replace|restrict|right|rollback|row|savepoint|select|set|sqlite_version|sum|table|temp|temporary|then|to|transaction|trigger|upper|union|unique|update|using|vacuum|values|view|virtual|when|where|with|without";
			builtinConstants = "false|true|null";
			builtinFunctions = "typeof|int|integer|tinyint|smallint|mediumint|bigint|unsigned|big|int|int2|int8|character|varchar|varying|character|nchar|native||nvarchar|text|clob|blob|real|double|precision|float|numberic|decimal|boolean|date|datetime";
		} else if(varDBType == 'oracle') {
			keywords = "ABORT|ACCEPT|ACCESS|ADD|ALL|ALTER|AND|ANY|ARRAY|ARRAYLEN|AS|ASC|ASSERT|ASSIGN|AT|ATTRIBUTES|AUDIT|AUTHORIZATION|AVG|BASE_TABLE|BEGIN|BETWEEN|BINARY_INTEGER|BODY|BOOLEAN|BY|CASE|CAST|CHAR|CHAR_BASE|CHECK|CLOSE|CLUSTER|CLUSTERS|COLAUTH|COLUMN|COMMENT|COMMIT|COMPRESS|CONNECT|CONNECTED|CONSTANT|CONSTRAINT|CRASH|CREATE|CURRENT|CURRVAL|CURSOR|DATABASE|DATA_BASE|DATE|DBA|DEALLOCATE|DEBUGOFF|DEBUGON|DECIMAL|DECLARE|DEFAULT|DEFINITION|DELAY|DELETE|DESC|DIGITS|DISPOSE|DISTINCT|DO|DROP|ELSE|ELSIF|ENABLE|END|ENDFOLDER|ENTRY|ESCAPE|EXCEPTION|EXCEPTION_INIT|EXCHANGE|EXCLUSIVE|EXISTS|EXIT|EXTERNAL|FAST|FETCH|FILE|FOR|FORCE|FORM|FROM|FUNCTION|GENERIC|GOTO|GRANT|GROUP|HAVING|IDENTIFIED|IF|IMMEDIATE|IN|INCREMENT|INDEX|INDEXES|INDICATOR|INITIAL|INITRANS|INSERT|INTERFACE|INTERSECT|INTO|IS|KEY|LEVEL|LIBRARY|LIKE|LIMITED|LOCAL|LOCK|LOG|LOGGING|LONG|LOOP|MASTER|MAXEXTENTS|MAXTRANS|MEMBER|MINEXTENTS|MINUS|MISLABEL|MODE|MODIFY|MULTISET|NEW|NEXT|NO|NOAUDIT|NOCOMPRESS|NOLOGGING|NOPARALLEL|NOT|NOWAIT|NUMBER_BASE|OBJECT|OF|OFF|OFFLINE|ON|ONLINE|ONLY|OPEN|OPTION|OR|ORDER|OUT|PACKAGE|PARALLEL|PARTITION|PCTFREE|PCTINCREASE|PCTUSED|PLS_INTEGER|POSITIVE|POSITIVEN|PRAGMA|PRIMARY|PRIOR|PRIVATE|PRIVILEGES|PROCEDURE|PUBLIC|RAISE|RANGE|RAW|READ|REBUILD|RECORD|REF|REFERENCES|REFRESH|RELEASE|RENAME|REPLACE|RESOURCE|RESTRICT|RETURN|RETURNING|REVERSE|REVOKE|ROLLBACK|ROW|ROWID|ROWLABEL|ROWNUM|ROWS|RUN|SAVEPOINT|SCHEMA|SEGMENT|SELECT|SEPARATE|SESSION|SET|SHARE|SNAPSHOT|SOME|SPACE|SPLIT|SQL|START|STARTFOLDER|STATEMENT|STORAGE|SUBTYPE|SUCCESSFUL|SYNONYM|TABAUTH|TABLE|TABLES|TABLESPACE|TASK|TERMINATE|THEN|TO|TRIGGER|TRUNCATE|TYPE|UNION|UNIQUE|UNLIMITED|UNRECOVERABLE|UNUSABLE|UPDATE|USE|USING|VALIDATE|VALUE|VALUES|VARIABLE|VIEW|VIEWS|WHEN|WHENEVER|WHERE|WHILE|WITH|WORK";
			builtinConstants = "false|true|null";
			builtinFunctions = "ABS|ACOS|ADD_MONTHS|ASCII|ASIN|ATAN|ATAN2|AVERAGE|BFILENAME|CEIL|CHARTOROWID|CHR|CONCAT|CONVERT|COS|COSH|COUNT|DECODE|DEREF|DUAL|DUMP|DUP_VAL_ON_INDEX|EMPTY|ERROR|EXP|FLOOR|FOUND|GLB|GREATEST|HEXTORAW|INITCAP|INSTR|INSTRB|ISOPEN|LAST_DAY|LEAST|LENGTH|LENGTHB|LN|LOWER|LPAD|LTRIM|LUB|MAKE_REF|MAX|MIN|MOD|MONTHS_BETWEEN|NEW_TIME|NEXTVAL|NEXT_DAY|NLSSORT|NLS_CHARSET_DECL_LEN|NLS_CHARSET_ID|NLS_CHARSET_NAME|NLS_INITCAP|NLS_LOWER|NLS_SORT|NLS_UPPER|NOTFOUND|NO_DATA_FOUND|NVL|OTHERS|POWER|RAWTOHEX|REFTOHEX|ROUND|ROWCOUNT|ROWIDTOCHAR|RPAD|RTRIM|SIGN|SIN|SINH|SOUNDEX|SQLCODE|SQLERRM|SQRT|STDDEV|SUBSTR|SUBSTRB|SUM|SYSDATE|TAN|TANH|TO_CHAR|TO_DATE|TO_LABEL|TO_MULTI_BYTE|TO_NUMBER|TO_SINGLE_BYTE|TRANSLATE|TRUNC|UID|UPPER|USER|USERENV|VARIANCE|VSIZE";
//		} else if(varDBType == 'cubrid') {
//			
		} else if(varDBType == 'tajo') {
			keywords = "as|all|and|any|asymmetric|asc|both|case|cast|create|external|cross|current_date|current_time|current_timestamp|desc|distinct|end|else|except|full|from|group|having|ilike|in|inner|intersect|into|is|join|leading|left|like|limit|natural|not|on|or|order|outer|over|right|select|some|symmetric|table|then|trailing|union|unique|using|when|where|with|window";
			builtinConstants = "false|true|null";
			builtinFunctions = "explain|" +
						"to_bin|to_char|to_hex|" +
						"abs|acos|asic|atan|atan2|cbrt|ceil|cos|degrees|div|exp|floor|mod|pi|pow|radians|random|round|sign|sin|sqrt|tan|" +
						"add_days|add_months|current_date|current_time|extract|date_part|now|to_char|to_date|to_timestamp|to_timestamp|utc_usec_to|" +
						"geoip_country_code|geoip_country_code|geoip_in_country|geoip_in_country|" +
						"json_extract_path_text|json_array_get|json_array_contains|json_array_length|" +
						"boolean|bool|bit|varbit|int1|int2|int4|int8|tinyint|smallint|int|integer|bigint|float4|float8|real|float|double|numeric|decimal|char|varchar|nchar|nvarchar|text|blob|date|interval|time|timetz|timestamp|binary|varbinary|blob|bytea|inet4" ;
		} else if(varDBType == 'altibase') {
			keywords = "ABSOLUTE|ADD|AFTER|AGER|ALL|ALLOCATE|ALTER|AND|ANY|ARCHIVE|ARCHIVELOG|AS|ASC|ASENSITIVE|AT|AUTOCOMMIT|BACKUP|BATCH|BEFORE|BEGIN|BETWEEN|BLOB_FILE|BREAK|BY|CASCADE|CASE|CAST|CLEAR_RECPTRS|CLOB_FILE|CLOSE|COALESCE|COLUMN|COMMIT|COMPILE|CONNECT|CONSTANT|CONSTRAINT|CONSTRAINTS|CONTINUE|CREATE|CUBE|CURSOR|CYCLE|DATABASE|DEALLOCATE|DECLARE|DEFAULT|DELETE|DEQUEUE|DESC|DESCRIPTOR|DIRECTORY|DISABLE|DISABLE_RECPTR|DISCONNECT|DISTINCT|DO|DROP|EACH|ELSE|ELSEIF|ELSIF|ENABLE|ENABLEALL_RECPTRS|ENABLE_RECPTR|END|ENQUEUE|ESCAPE|EXCEPTION|EXEC|EXECUTE|EXISTS|EXIT|EXTENTSIZE|FALSE|FETCH|FIFO|FIRST|FIXED|FLUSH|FOR|FOREIGN|FOUND|FREE|FROM|FULL|FUNCTION|GOTO|GRANT|GROUP|GROUPING|HAVING|HOLD|IDENTIFIED|IF|IMMEDIATE|IN|INDEX|INDICATOR|INNER|INSENSITIVE|INSERT|INTERSECT|INTO|IS|ISOLATION|JOIN|KEY|LAST|LEFT|LESS|LEVEL|LIFO|LIKE|LIMIT|LOB|LOCAL|LOCK|LOGANCHOR|LOOP|MAXROWS|MERGE|MINUS|MODE|MOVE|MOVEMENT|NEW|NEXT|NOARCHIVELOG|NOCYCLE|NOPARALLEL|NOT|NULL|OF|OFF|OFFLINE|OLD|ON|ONERR|ONLINE|ONLY|OPEN|OPTION|OR|ORDER|OTHERS|OUT|OUTER|PARALLEL|PARTITION|PARTITIONS|PREPARE|PRIMARY|PRIOR|PRIVILEGES|PROCEDURE|PUBLIC|QUEUE|RAISE|READ|REBUILD|RECOVER|REFERENCES|REFERENCING|RELATIVE|RELEASE|RENAME|REPLACE|REPLICATION|RESTRICT|RETURN|REVERSE|REVOKE|RIGHT|ROLLBACK|ROLLUP|ROW|ROWCOUNT|ROWTYPE|SAVEPOINT|SCROLL|SELECT|SENSITIVE|SEQUENCE|SESSION|SET|SETS|SOME|SPLIT|SQLCODE|SQLERRM|SQLERROR|SQLLEN|START|STATEMENT|STEP|STORE|SYNONYM|TABLE|TABLESPACE|TEMPORARY|THAN|THEN|THREADS|TO|TRIGGER|TRUE|TRUNCATE|TYPE|TYPESET|UNION|UNIQUE|UNTIL|UPDATE|USER|USING|VALUES|VARCHAR|VARIABLE|VIEW|VOLATILE|WAIT|WAKEUP_RECPTR|WHEN|WHENEVER|WHERE|WHILE|WITH|WORK|WRITE";
			builtinConstants = "true|false|null";
			builtinFunctions = "ABS (n)|ACOS (n)|ASIN (n)|ATAN (n)|ATAN2 (m, n)|BITAND (m, n)|CEIL (n)|COS (n)|COSH (n)|EXP (n)|FLOOR (n)|LN (n)|LOG (m,n)|MOD (m,n)|POWER|MOD (m,n)|ROUND (m, n)|SIGN (n)|SIN (n)|SINH (n)|SQRT (n)|TAN (n)|TANH (n)|TRUNC (m, n)|CHR (n)|CONCAT (char1,char2)|INITCAP (char)|LOWER (char)|LPAD (expr1,n, expr2)|LTRIM (char, set)|REPLACE(char, str1, str2)|RPAD (expr1, n , expr2)|RTRIM (char, set)|SUBSTR|TRANSLATE (expr, str1, str2)|TRIM(expr1, expr2)|UPPER (char)|ASCII (char)|INSTR (string, substring, position, occurrence)|LENGTH(char)|ADD_MONTH (date, integer)|EXTRACT|LAST_DAY|MONTHS_BETWEEN(date, date)|NEXT_DAY(date, char)|ROUND (date, fmt)|SYSDATE|TO_CHAR (datetime, fmt)|TRUNC(date, fmt)|ASCIISTR (char)|BIN_TO_NUM (exp)|CAST|TO_CHAR (character)|TO_CHAR (number, fmt)|TO_DATE (char, fmt)|TO_NCHAR(character)|TO_NCHAR(datetime)|TO_NCHAR(number)|TO_NUMBER(expr)|UNISTR(string)|DECODE(expr, search, result)|DUMP (expr)|GREATEST (expr)|LEAST (expr)|NVL(expr1, expr2)|NVL2(expr1, expr2, expr3)|AVG (var)|COUNT (var)|MIN (var)|MAX(var)|SUM(var)|DENSE_RANK|RANK|ROW_NUMBER|STDDEV(var)|VARIANCE";			
		} else {
			keywords = "select|insert|update|delete|from|where|and|or|group|by|order|limit|offset|having|as|case|" +
						"when|else|end|type|left|right|join|on|outer|desc|asc|union" +
						"into|values";
			builtinConstants = "true|false|null";
			builtinFunctions = "typeof|int|integer|tinyint|smallint|mediumint|bigint|unsigned|big|int|int2|int8|character|varchar|varying|character|nchar|native||nvarchar|text|clob|blob|real|double|precision|float|numberic|decimal|boolean|date|datetime"; 
		}
	
		var keywordMapper = this.createKeywordMapper({
	        "support.function": builtinFunctions,
	        "keyword": keywords,
	        "constant.language": builtinConstants
	    }, "identifier", true);
	
	    this.$rules = {
	        "start" : [ {
	            token : "comment",
	            regex : "--.*$"
	        },  {
	            token : "comment",
	            start : "/\\*",
	            end : "\\*/"
	        }, {
	            token : "string",           // " string
	            regex : '".*?"'
	        }, {
	            token : "string",           // ' string
	            regex : "'.*?'"
	        }, {
	            token : "constant.numeric", // float
	            regex : "[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"
	        }, {
	            token : keywordMapper,
	            regex : "[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
	        }, {
	            token : "keyword.operator",
	            regex : "\\+|\\-|\\/|\\/\\/|%|<@>|@>|<@|&|\\^|~|<|>|<=|=>|==|!=|<>|="
	        }, {
	            token : "paren.lparen",
	            regex : "[\\(]"
	        }, {
	            token : "paren.rparen",
	            regex : "[\\)]"
	        }, {
	            token : "text",
	            regex : "\\s+"
	        } ]
	    };
	    this.normalizeRules();
	};

	oop.inherits(DynHighlightRules, TextHighlightRules);
	exports.DynHighlightRules = DynHighlightRules;
});