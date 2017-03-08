$(document).ready(setupFlow);

function setupFlow() {
	$("#BoardDimensions").hide();
	$("#SavedBoard").hide();
	$("#EditBoard").hide();
	$("#BoardCanvas").hide();
	$("#GetBoard").hide();
	$("#SolveButtons").hide();
	$("#SaveBoardArea").hide();
	
	$("#EnterNewBoard").click(showNewBoardInput);
	$("#GoToEnterSavedBoard").click(showSavedBoardInput);
	$("#NewBoardBack").click(showBoardInputOptions);
	$("#SavedBoardBack").click(showBoardInputOptions);
	$("#EnterBoardDimensions").click(editBoard);
	$("#EnterSavedBoard").click(editBoard);
	$("#EditBoardBack").click(showBoardInputOptions);
	$("#EditBoardOK").click(startSolving);
	$("#EditBoardButton").click(editBoard);
	$("#SaveBoard").click(showSaveBoardSetup);
	$("#DoneSaving").click(startSolving);
}

function showBoardInputOptions() {
	$("#BoardDimensions").hide();
	$("#SavedBoard").hide();
	
	$("#EditBoard").hide();
	$("#BoardCanvas").hide();
	
	$("#EnterBoardOptions").show();
}

function showNewBoardInput() {
	$("#BoardDimensions").show();
	$("#EnterBoardOptions").hide();
}

function showSavedBoardInput() {
	$("#SavedBoard").show();
	$("#EnterBoardOptions").hide();
}

function editBoard() {
	$("#BoardDimensions").hide();
	$("#SavedBoard").hide();
	$("#SolveButtons").hide();
	$("#BoardCanvas").show();
	$("#EditBoard").show();
}

function startSolving() {
	$("#EditBoard").hide();
	$("#SaveBoardArea").hide();
	var boardWidth = document.getElementById("BoardCanvas").width;
	$("#StepAndSolve").width(Math.max(150, boardWidth - 181));
	$("#SolveButtons").show();
}

function showSaveBoardSetup() {
	$("#SolveButtons").hide();
	$("#SaveBoardArea").show();
}