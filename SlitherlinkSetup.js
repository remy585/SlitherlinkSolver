// TODO: make the UI a little cleaner. Don't show the puzzle area until they've entered a width and height
// TODO: make some little diagrams for each puzzle type, also include how to measure width and height when it might not be obvious
// TODO: make a "draw board" option where they enter the number of sides for each cell... oh boy...
// TODO: make an easier way to get the JSON for the current board
// TODO: makde an un-delete button...

// This is the setup for a generalized slitherlink

var NumRows;
var NumCols;
var BoardWidth;
var BoardHeight;
var CellType;

//cell = {x, y, corners, lines, top, bottom, left, right, content, id, originalId}
var Cells;

var CurrentBoard;
var CurrentlyMarkedMarks;
var Steps;

var DeletingCells;
var HighlightedCell;

window.onload = setupDOM;

function setupDOM() {
	nullOut();
	
	$("#Thinking").hide();
	$("#GuessDepth").hide();
	$("#EnterBoardDimensions").click(enterBoardDimensions);
	$("#DeleteCells").click(delteButtonClicked);
	$("#BoardCanvas").click(boardClick);
	$("#BoardCanvas").mousemove(boardHover);
	$("#BoardCanvas").mouseout(unHighlight);
	//$("#SolveButton").click(solveAll);
	//$("#StepButton").click(step);
	$("#SolveButton").on("mousedown",function(){$("#GuessDepth").hide();$("#Thinking").show();}).on("mouseup", solveAll);
	$("#StepButton").on("mousedown",function(){$("#GuessDepth").hide();$("#Thinking").show();}).on("mouseup", step);

	
	$("#StepBackButton").click(stepBack);
	$("#EnterSavedBoard").click(enterSavedBoard);
	$("#GetBoard").click(getBoardJSON);
}

function nullOut() {
	NumRows = 0;
	NumCols = 0;
	BoardWidth = 0;
	BoardHeight = 0;
	CellType = 0;
	Cells = [];
	CurrentBoard = null;
	CurrentlyMarkedMarks = [];
	Steps = [];
	DeletingCells = false;
	$("#DeleteCells").prop("checked", false);
	unHighlight();
}

function enterBoardDimensions() {
	nullOut();
	NumRows = parseInt($("#BoardWidth").val(), 10);
	NumCols = parseInt($("#BoardHeight").val(), 10);
	CellType = parseInt($("#BoardType").val(), 10);
	
	var canvas = document.getElementById("BoardCanvas");
	var context = canvas.getContext("2d");
	
	setBoardSize(canvas, CellType, NumRows, NumCols);
	
	for (var y = 0; y < NumCols; y++) {
		for (var x = 0; x < NumRows; x++) {
			addNewCell(context, CellType, x, y);
		}
	} 
}

function delteButtonClicked() {
	DeletingCells = $("#DeleteCells").is(":checked");
	if (!DeletingCells) {
		unHighlight();	
	}
}

function boardClick(clickEvent) {
	var x = clickEvent.offsetX;
	var y = clickEvent.offsetY;
	var cell = findCell(x, y);
	
	if (cell != null) {
		if (DeletingCells) {
			deleteCell(cell);
		} else {
			var cellContent = parseInt($("#EnterCellValue").val(), 10);
			if (isNaN(cellContent)) cellContent = null;
			
			if (cellContent > CellType) {
				alert("number entered is too high, must be " + CellType + " or smaller.");
				return;
			} else if (cellContent < 0) {
				alert("number entered must be non-negative.");
				return;	
			}
		
			cell.content = cellContent;
			drawEmptyCell(cell);
		}
	}
}

function deleteCell(cell) {
	unHighlight();
	var position = cell.id;
	Cells.splice(position, 1);
	
	for (var i = 0; i < Cells.length; i++) {
		Cells[i].id = i;	
	}
	
	redrawBoard();
}

function boardHover(event) {
	if (DeletingCells) {
		var x = event.offsetX;
		var y = event.offsetY;
		var cell = findCell(x, y);
		if (cell != null) {
			highlightCell(cell);
		}
	}	
}

function step() {
	solve(true);
}

function solveAll() {
	solve(false);	
}

function solve(goOneStep) {
	var board = CurrentBoard;
	if (board == null) {
		board = readBoardContents();
	}
	
	$("#GuessDepth").hide();	
	var startTime = Date.now();
	var solution = SLSolver.Solve(board, goOneStep);
	var endTime = Date.now();
	drawSoutionBoard(solution, goOneStep, solution.MaxGuessingDepthReached >= 0);
	$("#Thinking").hide();
	CurrentBoard = solution;
	
	if (solution.MaxGuessingDepthReached >= 0) {
		$("#GuessDepth").text("Guess made at depth: " + solution.MaxGuessingDepthReached);
		$("#GuessDepth").show();	
	}
	
	if (!solution.ChangeMade) {
		$("#GuessDepth").text("No new change. Guess made at depth: " + solution.MaxGuessingDepthReached);
		$("#GuessDepth").show();
	}
	
	$("#Time").text(endTime - startTime + " miliseconds");
}

function stepBack() {
	var canvas = document.getElementById("BoardCanvas")
	var context = canvas.getContext("2d");
	
	if (Steps.length > 0) {
		var lastStep = Steps.pop();
		for (var i = 0; i < lastStep.length; i++) {
			var mark = CurrentBoard.Marks[lastStep[i]];
			mark.ClearMark();
			drawLine(context, mark.Dots[0].X, mark.Dots[0].Y, mark.Dots[1].X, mark.Dots[1].Y, false, "#AAA");
		}	
	}
}

// This is the json of the contents object we pass to the solver
// This won't change the board width or height or type, so set those manually before using this
function enterSavedBoard() {
	var boardJSONString = $("#SavedBoardInput").val();
	var boardContents = JSON.parse(boardJSONString);
	
	$("#BoardWidth").val(boardContents.width);
	$("#BoardHeight").val(boardContents.height);
	$("#BoardType").val(boardContents.cellType);
	
	enterBoardDimensions();
	
	for (var i = boardContents.cells.length - 1; i >= 0; i--) {
		var content = boardContents.cells[i];
		if (content == null) {
			deleteCell(Cells[i]);
		} else {
			Cells[i].content = content == -1 ? null : content;
			drawEmptyCell(Cells[i]);
		}
	}
}

function getBoardJSON() {
	var board = {width: NumRows, height:NumCols, cellType:CellType};
	var cells = [];
	var blah = 0;
	for (var i = 0; i < Cells.length; i++) {
		var cell = Cells[i];
		while (cell.originalId > blah) {
			cells.push(null);
			blah++;
		}
		
		var content = cell.content;
		cells.push(content == null ? -1 : content);
		blah++;
	}
	
	for (var i = blah; blah < NumRows * NumCols; blah++) {
		cells.push(null);
	}
	
	board.cells = cells;
	
	var jsonString = JSON.stringify(board);
	$("#SavedBoardInput").val(jsonString);
}


function setBoardSize(canvas, cellType, numRows, numCols) {
	if (cellType == 4) {
		BoardWidth = numRows * 25 + 1;
		BoardHeight = numCols * 25;	
	} else if (cellType == 3) {
		BoardWidth = numRows * 17 + 17;
		BoardHeight = numCols * 30;
	} else if (cellType == 6) {
		BoardWidth = numRows * 37 + 12;
		BoardHeight = numCols * 42 + 21;	
	}
	
	canvas.width = BoardWidth;
	canvas.height = BoardHeight;
}

function addNewCell(context, cellType, row, col) {
	var corners = getCorners(cellType, row, col);
	
	if (corners != null && corners.length > 0) {
		var centerPoint = getCenterPoint(corners);
		var lastCorner = corners[corners.length - 1];
		var cell = {row: row, 
					col: col, 
					x: centerPoint.x, 
					y: centerPoint.y, 
					corners: corners, 
					lines: [], 
					top: lastCorner.y, 
					bottom: lastCorner.y, 
					left: lastCorner.x, 
					right: lastCorner.x, 
					content: null,
					id: Cells.length,
					originalId: Cells.length
				   };
		
		var x = lastCorner.x;
		var y = lastCorner.y;
		for (var i = 0; i < corners.length; i++) {
			var nextX = corners[i].x;
			var nextY = corners[i].y;
			cell.lines.push(getLine(x, y, nextX, nextY));
			x = nextX;
			y = nextY;
			
			cell.top = Math.min(cell.top, y);
			cell.bottom = Math.max(cell.bottom, y);
			cell.left = Math.min(cell.left, x);
			cell.right = Math.max(cell.right, x);
		}
		
		Cells.push(cell);
		drawEmptyCell(cell);
	}
}

function findCell(x, y) {
	var possibleCells = [];
	var cell;
	
	// see what cells the point is within the bounding box of
	for (var i = 0; i < Cells.length; i++) {
		cell = Cells[i];
		if (x <= cell.right && x >= cell.left &&
			y >= cell.top   && y <= cell.bottom) {
				possibleCells.push(cell);
		}
	}
	
	// do the ray casting thing to see which of the possible cells the point is actually inside of.
	var ray = getLine(x, y, x+1, y);
	for (var i = 0; i < possibleCells.length; i++) {
		cell = possibleCells[i];
		
		var linesIntersected = 0;
		var x1 = cell.corners[cell.corners.length - 1].x;
		for (var j = 0; j < cell.lines.length; j++) {
			var x2 = cell.corners[j].x;
			var line = cell.lines[j];
			var intersect = findIntersect(ray.m, ray.b, line.m, line.b);
			
			// see if the intersect point is within the domain and range of the cell's side
			if (intersect.x > x && intersect.x > Math.min(x1,x2) && intersect.x < Math.max(x1,x2)) {
				linesIntersected++;
			}
			
			x1 = x2;
		}
		
		if (linesIntersected % 2 == 1) {
			return cell;	
		}
	}
	
	// (x,y) coordinates did not overlap a cell. 
	// it may have been directly on a line, or in a gap between cells on the side
	return null;
}

// returns an object containing Dots, Marks, and Cells arrays
function readBoardContents() {
	cells = [];
	dots = [];
	marks = [];
	
	// populate cells
	for (var i = 0; i < Cells.length; i++) {
		cells.push(new SLSolver.Cell(i, Cells[i].content));
	}
	
	// populate dots
	// go through Cells and add all corners
	for (var i = 0; i < Cells.length; i++) {
		var cell = Cells[i];
		for (var c = 0; c < cell.corners.length; c++) {
			var corner = cell.corners[c];
			var isDupe = false;
			
			// check for duplicates
			for (var d = 0; d < dots.length; d++) {
				var dot = dots[d];
				if (dot.X == corner.x && dot.Y == corner.y) {
					isDupe = true;
					corner.dotId = dot.Id;
					break;	
				}
			}
			
			if (!isDupe) {
				var dotId = dots.length;
				corner.dotId = dotId;
				dots.push(new SLSolver.Dot(dotId, corner.x, corner.y));	
			}
		}	
	}
	
	// populate marks
	// go through cells, make a new mark for every pair of corners
	// probably would be able to combine this loop with the dot loop, if you really wanted to
	for (var i = 0; i < Cells.length; i++) {
		var cell = Cells[i];
		var corner1 = cell.corners[cell.corners.length - 1];
		for (var j = 0; j < cell.corners.length; j++) {
			var corner2 = cell.corners[j];
			
			// check for duplicates by way of dot id's
			var mark = null;
			for (var k = 0; k < marks.length; k++) {
				var dupeMark = marks[k];
				var dupeDotCount = 0;
				for (var l = 0; l < dupeMark.Dots.length; l++) {
					var dot = dupeMark.Dots[l];
					if (dot.Id == corner1.dotId || dot.Id == corner2.dotId) dupeDotCount++;
				}
				
				if (dupeDotCount == 2) {
					mark = dupeMark;
					break;	
				}
			}
			
			if (mark == null) {
				// this is a completely new mark, create it, connect dots
				mark = new SLSolver.Mark(marks.length);
				marks.push(mark);
				
				var dot1 = dots[corner1.dotId];
				var dot2 = dots[corner2.dotId];
				mark.AddDot(dot1);
				mark.AddDot(dot2);
				dot1.AddMark(mark);
				dot2.AddMark(mark);
			}
			
			mark.AddCell(cells[i]);
			cells[i].AddMark(mark);
			
			corner1 = corner2;	
		}
	}
	
	return {Marks:marks, Dots:dots, Cells:cells};
}

function drawSoutionBoard(board, highlightNew, newMoveBasedOnAGuess) {
	var canvas = document.getElementById("BoardCanvas")
	var context = canvas.getContext("2d");
	var step = [];
	var highlightColor = "lightgreen";
	if (newMoveBasedOnAGuess) highlightColor = "orange";
	
	for (var i = 0; i < board.Cells.length; i++) {
		var cell = board.Cells[i];
		if (cell.Side == 0) {
			fillCell(context, this.Cells[cell.Id], "lightblue");	
		} else if (cell.Side == 1) {
			fillCell(context, this.Cells[cell.Id], "yellow");	
		}
		
		if (cell.Value != null && (cell.Side == 0 || cell.Side == 1)) {
			drawNumber(context, cell.Value, this.Cells[cell.Id]);	
		}
	}
	
	for (var i = 0; i < board.Marks.length; i++) {
		var mark = board.Marks[i];
		var newMark = highlightNew && !CurrentlyMarkedMarks[i];
		if (mark.IsMarked && newMark) {
			CurrentlyMarkedMarks[i] = true;
			step.push(i);
		}
		
		if (mark.IsMarked && mark.IsLine) {
			drawLine(context, mark.Dots[0].X, mark.Dots[0].Y, mark.Dots[1].X, mark.Dots[1].Y, newMark, highlightColor);
		} else if (mark.IsMarked && !mark.IsLine) {
			var lineCenter = getCenterPoint([{x:mark.Dots[0].X, y:mark.Dots[0].Y}, {x:mark.Dots[1].X, y:mark.Dots[1].Y}]);
			drawLine(context, mark.Dots[0].X, mark.Dots[0].Y, mark.Dots[1].X, mark.Dots[1].Y, false, "#fff", "#EEE");
			drawX(context, lineCenter.x, lineCenter.y, newMark, highlightColor);
		}
	}
	
	Steps.push(step);
}


// TODO: generalize this method
// I made verticle lines not quite verticle... to save devide by zero issues later...
function getCorners(cellType, row, col) {
	if (cellType == 4) {
		var x = row * 25;
		var y = col * 25;
		return [{x:x+25, y:y}, {x:x+26, y:y+25}, {x:x+1, y:y+25}, {x:x, y:y}];
	} else if (cellType == 3) {
		var x = row * 17;
		var y = col * 30;
		
		if ((col % 2 == 1 && row % 2 == 0) || (col % 2 == 0 && row % 2 == 1)) {
			// rightside-up triangle
			return [{x:x+17, y:y}, {x:x+34, y:y+30}, {x:x, y:y+30}];
		} else {
			// upside-down triangle
			return [{x:x, y:y}, {x:x+34, y:y}, {x:x+17, y:y+30}];
		}	
	} else if (cellType == 6) {
		var x = row * 37;
		var y = col * 42;
		
		if (row % 2 == 1) {
			y += 21;
		}
		
		return[{x:x, y:y+21}, {x:x+12, y:y}, {x:x+37, y:y}, {x:x+49, y:y+21}, {x:x+37, y:y+42}, {x:x+12, y:y+42}];
	}
}

// points is an array of {x, y} objects
// returns an {x, y} object where x and y are ints. if the true center contains a decimal point it has simply been stripped off...
function getCenterPoint(points) {
	var sumX = 0;
	var sumY = 0;
	for (var i = 0; i < points.length; i ++) {
		sumX += points[i].x;
		sumY += points[i].y;
	}
	
	return {x:Math.floor(sumX / points.length), y:Math.floor(sumY / points.length)};
}

function getLine(x1, y1, x2, y2) {
	var m = (y1 - y2) / (x1 - x2);
	var b = y1 - (m * x1);
	
	return {m:m, b:b}; 	
}

function findIntersect(m1, b1, m2, b2) {
	// y = mx + b
	// y1 = y2
	// m1x + b1 = m2x + b2
	// m1x - m2x = b2 - b1
	// (m1-m2)x = b2 - b1
	// x = (b2 - b1) / (m1 - m2)
	// y = m1x + b1
	
	var x = (b2 - b1) / (m1 - m2);
	var y = (m1 * x) + b1;
	return {x:x, y:y}; 
}

function redrawBoard() {
	var canvas = document.getElementById("BoardCanvas");
	var context = canvas.getContext("2d");
	context.clearRect(0, 0, canvas.width, canvas.height);
	for (var i = 0; i < Cells.length; i++) {
		drawEmptyCell(Cells[i]);	
	}	
}

function drawEmptyCell(cell) {
	var context = document.getElementById("BoardCanvas").getContext("2d");
	fillCell(context, cell, "white");
	
	if (cell.content != null) {
		drawNumber(context, cell.content, cell);
	}
}

function highlightCell(cell) {
	unHighlight();
	var context = document.getElementById("BoardCanvas").getContext("2d");
	fillCell(context, cell, "yellow");
	
	if (cell.content != null) {
		drawNumber(context, cell.content, cell);
	}
	
	HighlightedCell = cell;
}

function unHighlight() {
	var cell = HighlightedCell;
	if (cell != null) {
		var context = document.getElementById("BoardCanvas").getContext("2d");
		fillCell(context, cell, "white");
		
		if (cell.content != null) {
			drawNumber(context, cell.content, cell);
		}
		
		HighlightedCell = null;
	}
}

function fillCell(context, cell, color) {
	var corners = cell.corners;
	context.fillStyle = color;
	context.strokeStyle = "gray";
	context.beginPath();
	context.moveTo(corners[corners.length - 1].x, corners[corners.length - 1].y);
	for (var i = 0; i < corners.length; i++) {
		context.lineTo(corners[i].x, corners[i].y);	
	}
	
	context.closePath();
	context.fill();
	context.stroke();
}

function drawNumber(context, number, cell) {
	// get the height and make font size to fit
	var height = cell.bottom - cell.top;
	context.beginPath();
	context.font = height - 7 + "px monoface";
	context.textBaseline = "middle";
	context.textAlign = "center";
	context.fillStyle = "black";
	context.fillText(number, cell.x, cell.y);
}

function drawX(context, x, y, highlight = false, highlightColor = "green") {
	if (highlight) {
		context.fillStyle = highlightColor;
	} else {
		context.fillStyle = "white";
	}
	context.beginPath();
	context.fillRect(x-4, y-4, 8, 8);
	
	context.fillStyle = "red";
	context.beginPath();
	context.fillRect(x-2, y-2, 4, 4);
}

function drawLine(context, x1, y1, x2, y2, highlight = false, highlightColor = "green", color = "black") {
	if (highlight) {
		context.strokeStyle = highlightColor;	
	} else {
		context.strokeStyle = "white";	
	}
	
	context.lineWidth = 4;
	context.beginPath();
	context.moveTo(x1, y1);
	context.lineTo(x2, y2);
	context.stroke();
	
	context.strokeStyle = color;
	context.lineWidth = 2;
	context.beginPath();
	context.moveTo(x1, y1);
	context.lineTo(x2, y2);
	context.stroke();
}

function drawDebugText(context, text, x, y, color, size) {
	context.beginPath();
	context.font = size + "px monoface";
	context.textBaseline = "middle";
	context.textAlign = "center";
	context.fillStyle = color;
	context.fillText(text, x, y);
}