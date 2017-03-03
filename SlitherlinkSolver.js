// TODO: perhaps cells should have a list of dots, and dots should have a list of cells?
// TODO: Does the validity checker look for loops?
// TODO: Make the validity checker only look at cells/marks/corners directly around the change?
// TODO: guesses only re-itterate through the marks that didn't fail out early the last time
// TODO: time each guess and report on average guess times?

var SLSolver = {
	// Parent object of Cell and Dot. Handles logic of keeping track of Marks
	MarkableObject: function() {
		this.Marks = [];
		this.NumLines = 0;
		this.NumXs = 0;
		this.NumUnmarked = 0;
		this.IsFull = false;
		
		// TODO: What if mark is coming in pre-marked? Need to update counts...
		this.AddMark = function(mark) {
			this.Marks[this.Marks.length] = mark;
			this.NumUnmarked++;
		};
		
		this.ContainsMark = function(mark) {
			for (var i = 0; i < this.Marks.length; i++) {
				if (this.Marks[i].Id == mark.Id) return true;
			}
			
			return false;
		};
		
		this.LineAdded = function() {
			this.NumLines++;
			this.IsFull = this.NumLines + this.NumXs == this.Marks.length;
			this.NumUnmarked--;
		};
		
		this.XAdded = function() {
			this.NumXs++;
			this.IsFull = this.NumLines + this.NumXs == this.Marks.length;
			this.NumUnmarked--;
		};
		
		this.LineErased = function() {
			this.NumLines--;
			this.IsFull = this.NumLines + this.NumXs == this.Marks.length;
			this.NumUnmarked++;
		};
		
		this.XErased = function() {
			this.NumXs--;
			this.IsFull = this.NumLines + this.NumXs == this.Marks.length;
			this.NumUnmarked++;
		};
	},
	
	// Defines the object that represents a puzzle cell that may or maynot have a number inside of it and that, in the end, will be surrounded by lines or 'x's. 
	Cell: function(id, value) {
		this.__proto__ = new SLSolver.MarkableObject();
		this.Id = id;
		this.Value = value; // Could be a number or null
		this.Side = -1;
		this.SideBeforeGuess = -1;
		
		this.IsValid = function() {
			return !(this.Value != null && (this.NumLines > this.Value || this.Marks.length - this.NumXs < this.Value));
		};
		
		// returns true if anything was actually changed
		this.SetSide = function(side, isBasedOnGuess) {
			var changeMade = false;
			if (this.Side == -1 || this.Side > side) {
				var oldSide = this.Side;
				this.Side = side;
				var otherSide = side - 1;
				if (side % 2 == 0) otherSide = side + 1;
				
				for (var i = 0; i < this.Marks.length; i++) {
					var mark = this.Marks[i];
					if (mark.IsMarked) {
						var otherCell = this.Marks[i].TheOtherCell(this);
						if (otherCell != null) {
							if (mark.IsLine) {
								otherCell.SetSide(otherSide, isBasedOnGuess);
							} else { 
								otherCell.SetSide(side, isBasedOnGuess);
							}
						}
					}
				}
				
				changeMade = true;
			}
			
			if (!isBasedOnGuess) {
				this.SideBeforeGuess = this.Side;
			}
			
			return changeMade;
		};
	},
	
	// Defines the object that, at the begining of the puzzle, are physically represented as dots. These will become the intersections of all the lines and 'x's.
	Dot: function(id, x, y) {
		this.__proto__ = new SLSolver.MarkableObject();
		this.Id = id;
		this.X = x;
		this.Y = y;
		
		this.IsValid = function() {
			return !(this.NumLines > 2 || (this.NumLines == 1 && this.IsFull));
		};
	},
	
	// Defines the object that, at the end of the puzzle, will be either a line or an 'x'
	Mark: function(id) {
		this.Id = id;
		this.Cells = [];
		this.Dots = [];
		this.IsMarked = false;
		this.IsLine = false;
		this.IsBasedOnGuess = false;
		
		this.GetOppositeSide = function(side) {
			if (side % 2 == 0) {
				return side + 1;	
			} else {
				return side - 1;	
			}
		};
		
		this.AddDot = function(dot) {
			this.Dots[this.Dots.length] = dot;
		};
		
		this.AddCell = function(cell) {
			this.Cells[this.Cells.length] = cell;
		};
		
		this.ContainsDot = function(dot) {
			for (var i = 0; i < this.Dots.length; i++) {
				if (this.Dots[i].Id == dot.Id) return true;
			}
			
			return false;
		};
		
		this.ContainsCell = function(cell) {
			for (var i = 0; i < this.Cells.length; i++) {
				if (this.Cells[i].Id == cell.Id) return true;
			}
			
			return false;
		};
		
		this.TheOtherCell = function(cell) {
			for (var i = 0; i < this.Cells.length; i++) {
				if (this.Cells[i].Id != cell.Id) return this.Cells[i];	
			}
			
			return null;	
		};
		
		this.TheOtherDot = function(dot) {
			for (var i = 0; i < this.Dots.length; i++) {
				if (this.Dots[i].Id != dot.Id) return this.Dots[i];
			}
			
			// should never be null
			return null;	
		};
		
		this.MarkLine = function(isBasedOnGuess, currentSidePairCount) {
			this.IsMarked = true;
			this.IsLine = true;
			this.IsBasedOnGuess = isBasedOnGuess;
			
			for (var i = 0; i < this.Cells.length; i++) {
				var cell = this.Cells[i];
				cell.LineAdded();
				
				var theOtherCell = this.TheOtherCell(cell);
				if (theOtherCell == null) {
					cell.SetSide(1, isBasedOnGuess);	
				} else if (theOtherCell.Side > -1) {
					cell.SetSide(this.GetOppositeSide(theOtherCell.Side), isBasedOnGuess);
				} else if (cell.Side == -1) {
					currentSidePairCount++;
					cell.SetSide(currentSidePairCount * 2, isBasedOnGuess);
				}	
			}
			
			for (var i = 0; i < this.Dots.length; i++) {
				this.Dots[i].LineAdded();
			}
			
			SLSolver.NumMarkedMarks++;
			return currentSidePairCount;
		};
		
		this.MarkX = function(isBasedOnGuess, currentSidePairCount) {
			this.IsMarked = true;
			this.IsLine = false;
			this.IsBasedOnGuess = isBasedOnGuess;
			
			for (var i = 0; i < this.Cells.length; i++) {
				var cell = this.Cells[i];
				cell.XAdded();
				
				var theOtherCell = this.TheOtherCell(cell);
				if (theOtherCell == null) {
					cell.SetSide(0, isBasedOnGuess);	
				} else if (theOtherCell.Side > -1) {
					cell.SetSide(theOtherCell.Side, isBasedOnGuess);
				} else if (cell.Side == -1) {
					currentSidePairCount++;
					cell.SetSide(currentSidePairCount * 2, isBasedOnGuess);
				}
			}
			
			for (var i = 0; i < this.Dots.length; i++) {
				this.Dots[i].XAdded();
			}
			
			SLSolver.NumMarkedMarks++;
			return currentSidePairCount;
		};
		
		this.ClearMark = function() {
			if (!this.IsMarked) {
				return;
			}
			
			this.IsMarked = false;
			this.IsBasedOnGuess = false;
			
			for (var i = 0; i < this.Cells.length; i++) {
				if (this.IsLine) {
					this.Cells[i].LineErased();
				} else {
					this.Cells[i].XErased();
				}
			}
			
			for (var i = 0; i < this.Dots.length; i++) {
				if (this.IsLine) {
					this.Dots[i].LineErased();
				} else {
					this.Dots[i].XErased();
				}
			}
			
			SLSolver.NumMarkedMarks--;
		};
	},
	
	// I've decided to make these simple arrays rather than matrixes because in the non-4-sided case it will be difficult to translate the layout of cells into a grid
	Cells: [],
	Dots: [],
	Marks: [],
	NumMarkedMarks: 0,
	MIN_GUESSING_DEPTH: 5,
	MAX_GUESSING_DEPTH: 1000,
	MaxGuessingDepthReached: -1,
	ChangeMade: false,
	SidePairCount: 0,
	JustChangedMarks: [],
	
	Solve: function(board, step) {
		this.Cells = board.Cells;
		this.Dots = board.Dots;
		this.Marks = board.Marks;
		this.NumMarkedMarks = 0;
		this.MaxGuessingDepthReached = -1;
		
		var changeMade = true;
		while (changeMade && this.NumMarkedMarks != this.Marks.length) {
			changeMade = this.RunBasicLogic(false);
			
			if (!changeMade) {
				changeMade = this.FindNextChangeBasedOnGuessing();
			}
			
			if (step) break;
		}
		
		board.ChangeMade = changeMade;
		board.MaxGuessingDepthReached = this.MaxGuessingDepthReached;
		return board;
	},
	
	//TODO: according to the performance analyser ApplyInsideOutsideLogic is being called first... maybe?
	RunBasicLogic: function(aGuessHasBeenMade) {
		var changeMade = this.CompleteCells(aGuessHasBeenMade);
		changeMade = changeMade || this.CompleteDots(aGuessHasBeenMade);
		changeMade = changeMade || this.ApplyInsideOutsideLogic(aGuessHasBeenMade);
		changeMade = changeMade || this.KeepLoopsOpen(aGuessHasBeenMade);
		
		var isValid = this.IsValidBoard();
		return changeMade;
	},
	
	FindNextChangeBasedOnGuessing: function() {
		if (this.NumMarkedMarks == this.Marks.length) {
			return false;
		}
		
		this.JustChangedMarks = [];
		for (var i = 0; i < this.Marks.length; i++) {
			var mark = this.Marks[i];
			if (!mark.IsMarked) {
				// try marking a line
				this.MarkLine(mark, true);
				var guessInfo = this.RunLogicBasedOnAGuess();
				this.MaxGuessingDepthReached = Math.max(guessInfo.movesMade, this.MaxGuessingDepthReached);
				var lineBasedMarks = this.ClearGuesses();
				if (!guessInfo.isValid) {
					// found logic error! mark must be an x!
					this.MarkX(mark, false);
					return true;
				} else if (guessInfo.isComplete) {
					this.MarkLine(mark, false);
					return true;	
				}
				
				// try marking an x
				this.MarkX(mark, true);
				guessInfo = this.RunLogicBasedOnAGuess();
				this.MaxGuessingDepthReached = Math.max(guessInfo.movesMade, this.MaxGuessingDepthReached);
				var xBasedMarks = this.ClearGuesses();
				if (!guessInfo.isValid) {
					// found logic error! mark must be a line!
					this.MarkLine(mark, false);
					return true;
				}  else if (guessInfo.isComplete) {
					this.MarkX(mark, false);
					return true;	
				}
				
				// if we weren't able to make any changes yet, see if there are similarities between the marks made when we guessed "x" and "line"
				// those marks will be the same either way
				var changeMade = false;
				for (var j = 0; j < this.Marks.length; j++) {
					if (lineBasedMarks.lines[j] && xBasedMarks.lines[j]) {
						this.MarkLine(this.Marks[j]);
						changeMade = true;	
					} else if (lineBasedMarks.xs[j] && xBasedMarks.xs[j]) {
						this.MarkX(this.Marks[j]);
						changeMade = true;
					}
				}
				
				if (changeMade) {
					return true;
				}
			}
		}
		
		return false;
	},
	
	RunLogicBasedOnAGuess: function() {
		var boardState = this.IsValidBoard();
		var numLogicMovesMade = 0;
		var changeMade = true;
		
		while (changeMade) {
			changeMade = this.RunBasicLogic(true);
			numLogicMovesMade++;
		}
		
		boardState = this.IsValidBoard();
		
		return {isValid:boardState.isValid, isComplete:boardState.isComplete, movesMade:numLogicMovesMade};
	},
	
	CompleteCells: function(aGuessHasBeenMade) {
		var changeMade = false;
		for (var i = 0; i < this.Cells.length; i++) {
			var cell = this.Cells[i];
			
			if (!cell.IsFull) {
				// mark the rest x's
				if ((cell.Value != null && cell.Value == cell.NumLines) || cell.NumLines == cell.Marks.length - 1) {
					for (var m = 0; m < cell.Marks.length; m++) {
						var mark = cell.Marks[m];
						if (!mark.IsMarked) {
							this.MarkX(mark, aGuessHasBeenMade);
							changeMade = true;
						}
					}
				}
			
				// mark the rest lines
				if (cell.Value != null && cell.Value == cell.Marks.length - cell.NumXs) {
					for (var m = 0; m < cell.Marks.length; m++) {
						var mark = cell.Marks[m];
						if (!mark.IsMarked) {
							this.MarkLine(mark, aGuessHasBeenMade);
							changeMade = true;
						}
					}
				}
			}
		}
		
		return changeMade;
	},
	
	CompleteDots: function(aGuessHasBeenMade) {
		var changeMade = false;
		
		for (var i = 0; i < this.Dots.length; i++) {
			var dot = this.Dots[i];
			if (!dot.IsFull) {
				var fillTheRest = false;
				var fillWithXs = false;
				if (dot.NumLines == 2 || dot.NumXs == dot.Marks.length - 1) {
					// fill the rest with x's
					fillTheRest = true;
					fillWithXs = true;
				} else if (dot.NumXs == dot.Marks.length - 2 && dot.NumLines == 1) {
					// fill the last spot with a line
					fillTheRest = true;
					fillWithXs = false;
				}
				
				if (fillTheRest) {
					for (var m = 0; m < dot.Marks.length; m++) {
						var mark = dot.Marks[m];
						if (!mark.IsMarked) {
							if (fillWithXs) {
								this.MarkX(mark, aGuessHasBeenMade);
							} else {
								this.MarkLine(mark, aGuessHasBeenMade);
							}
						}
					}
					
					changeMade = true;
				}
			}
		}
		
		return changeMade;
	},
	
	// if the cell's an outside cell and on the edge, mark an x
	// if the cells an inside cell and on the edge, mark a line
				
	// if the cells on either side are the same, mark an x
	// if the cells on either side are different (but in the same side family), mark a line
				
	// based on cell's value and the number counts of various sides we can make some marks
	ApplyInsideOutsideLogic: function(aGuessHasBeenMade) {
		var changeMade = false;
		var cellIdsToCheck = [];
		var markIdsToCheck = [];
		if (this.JustChangedMarks.length > 0) {
			for (var i = 0; i < this.JustChangedMarks.length; i++) {
				var mark = this.JustChangedMarks[i];
				for (var j = 0; j < mark.Cells.length; j++) {
					var cell = mark.Cells[j];
					cellIdsToCheck[cell.Id] = true;
					for (var k = 0; k < cell.Marks.length; k++) {
						markIdsToCheck[cell.Marks[k].Id] = true;
					}	
				}
			}
		} else {
			cellIdsToCheck = new Array(this.Cells.length);
			markIdsToCheck = new Array(this.Marks.length);
			cellIdsToCheck.fill(true);
			markIdsToCheck.fill(true);
		}
		
		for (var i = 0; i < markIdsToCheck.length; i++) {
			if (markIdsToCheck[i]) {
				var mark = this.Marks[i];
				if (!mark.IsMarked) {
					var side1 = mark.Cells[0].Side;
					var side2 = null;
					if (mark.Cells.length > 1) {
						side1 = Math.min(mark.Cells[0].Side, mark.Cells[1].Side);
						side2 = Math.max(mark.Cells[0].Side, mark.Cells[1].Side);
					}
					
					if (side1 > -1 && (side2 == null || side2 > -1)) {
						if (side1 == side2 || 
						   (side2 == null && side1 == 0)) {
							// if the cells on either side are the same, mark an x
							// if the cell's an outside cell and on the edge, mark an x
							this.MarkX(mark, aGuessHasBeenMade);
							changeMade = true;
						} else if ((side2 == null && side1 == 1) || 
								   (side2 != null && side1 != side2 && side2 - side1 == 1 && side1 % 2 == 0)) {
							// if the cells an inside cell and on the edge, mark a line
							// if the cells on either side are different (but in the same side family), mark a line
							this.MarkLine(mark, aGuessHasBeenMade);
							changeMade = true;
						}
					}
				}
			}
		}
		
		if (changeMade) {
			return true;	
		}
		
		for (var i = 0; i < cellIdsToCheck.length; i++) {
			if (cellIdsToCheck[i]) {
				var cell = this.Cells[i];
				if (cell.Value != null && !cell.IsFull) {
					var sideCounts = [];
					for (var j = 0; j < cell.Marks.length; j++) {
						var otherCell = cell.Marks[j].TheOtherCell(cell)
						var otherSide = 0;
						if (otherCell != null) otherSide = otherCell.Side;
						if (otherSide > -1) {
							if (!sideCounts[otherSide]) {
								sideCounts[otherSide] = [];
							} 
							
							sideCounts[otherSide].push(cell.Marks[j]);
						}
					}
					
					for (var j = 0; j < sideCounts.length; j++) {
						// if there are more than cell.Value cells adjacent to this one with the same side value, then there must be x's in those sides
						// if there are more than numSides - value cells adjacent to this one with the same side value, then there must be lines in those sides
						if (sideCounts[j]) {
							var sideCount = sideCounts[j].length;
							if (sideCount > cell.Value) {
								for (var k = 0; k < sideCount; k++) {
									var mark = sideCounts[j][k];
									if (!mark.IsMarked) {
										this.MarkX(mark, aGuessHasBeenMade);
										changeMade = true;
									}
								}
							} else if ((cell.Marks.length - cell.Value) < sideCount) {
								for (var k = 0; k < sideCount; k++) {
									var mark = sideCounts[j][k];
									if (!mark.IsMarked) {
										this.MarkLine(mark, aGuessHasBeenMade);	
										changeMade = true;
									}
								}
							}
						}
					}
				}
			}
		}
		
		return changeMade;
	},
	
	// TODO: if cells had a list of dots, this code could be re-factored
	ApplySpecialRules: function(aGuessHasBeenMade) {
		// cell needs two lines, and has a dot with two x's (not on the cell) already in place
		for (var i = 0; i < this.Cells.length; i++) {
			var cell = this.Cells[i];
			if (cell.Value != null) {
				var linesStillNeeded = cell.Value - cell.NumLines;
				if (linesStillNeeded >= 2 && cell.NumUnmarked == linesStillNeeded + 1) {
					var possibleDots = [];
					for (var j = 0; j < cell.Marks.length; j++) {
						var mark = cell.Marks[j];
						if (!mark.IsMarked) {
							// look at both dots, if one has only two open lines, and both of those lines are on this cell, then mark them both as lines
							for (var k = 0; k < mark.Dots.length; k++) {
								var dot = mark.Dots[k];
								if (dot.NumUnmarked == 2 && dot.NumLines == 0) {
									if (possibleDots[dot.Id]) {
										this.MarkLine(mark, aGuessHasBeenMade);
										return true;	
									} else {
										possibleDots[dot.Id] = true;	
									}
								}
							}
						}
					}
				}
			}
		}
		
		return false;
	},
	
	// Will will prevent the final loop from closing, so be cautious when you run this function
	KeepLoopsOpen: function(aGuessHasBeenMade) {
		// find possible loop start
		for (var i = 1; i < this.Dots.length; i++)
		{
			var loopStart = this.Dots[i];
			var loopEnds = new Array();
			if (loopStart.NumLines == 1)
			{
				var lineEnd = this.FollowLine(loopStart).lastDot;
				
				// check if lineEnd is one un-marked Mark away from loopStart;
				for (var g = 0; g < loopStart.Marks.length; g++)
				{
					var mark = loopStart.Marks[g];
					if (!mark.IsMarked) {
						if (mark.Dots.indexOf(lineEnd) >= 0) {
							// possible loop detected! Mark an X to keep that sucker open!
							this.MarkX(mark, aGuessHasBeenMade);
							return true;
						}
					}
				}
			}
		}
	
		return false;
	},
	
	FindSubLoop: function() {
		var dotsChecked = [];
		
		// find possible loop start
		for (var i = 1; i < this.Dots.length; i++)
		{
			if (!dotsChecked[i]) {
				var loopStart = this.Dots[i];
				var loopEnds = new Array();
				if (loopStart.NumLines > 0)
				{
					var line = this.FollowLine(loopStart);
					var lineEnd = line.lastDot;
					for (var j = 0; j < line.dotsTouched.length; j++) {
						dotsChecked[line.dotsTouched[j]] = true;
					}
					
					if (lineEnd.Id == loopStart.Id) {
						return true;	
					}
				}
			}
		}
	
		return false;
	},
	
	// Assumes that startingDot has no more than one line out of it
	// If the startingDot has no lines coming out of it, returns startingDot
	// Follows the lines and returns the last Dot it comes to
	// If startingDot is in the middle of a loop, returns null
	FollowLine: function(startingDot) {
		var currentDot = startingDot;
		var lastLine = null;
		var dotsTouched = [];
		
		while (true) {
			dotsTouched.push(currentDot.Id);
			
			// find the line to follow
			var nextLine = null;
			for (var i = 0; i < currentDot.Marks.length; i++) {
				var mark = currentDot.Marks[i];
				if (mark != lastLine && mark.IsMarked && mark.IsLine) {
					nextLine = mark;
					break;
				}
			}
			
			if (nextLine == null) {
				// we've reached a dead end
				return {lastDot:currentDot, dotsTouched:dotsTouched};
			}
			
			lastLine = nextLine;
			
			// move currentDot
			currentDot = lastLine.TheOtherDot(currentDot);
			
			if (currentDot == startingDot) {
				// this dot is part of a loop
				return {lastDot:currentDot, dotsTouched:dotsTouched};
			}
		}
	},
	
	MarkLine: function(mark, aGuessHasBeenMade) {
		if (aGuessHasBeenMade) {
			this.JustChangedMarks.push(mark);
		}
		
		this.SidePairCount = mark.MarkLine(aGuessHasBeenMade, this.SidePairCount);
	},
	
	MarkX: function(mark, aGuessHasBeenMade) {
		if (aGuessHasBeenMade) {
			this.JustChangedMarks.push(mark);
		}
		
		this.SidePairCount = mark.MarkX(aGuessHasBeenMade, this.SidePairCount);
	},
	
	IsValidBoard: function() {
		var isComplete = true;
		for (var i = 0; i < this.Cells.length; i++) {
			if (!this.Cells[i].IsValid()) {
				return {isValid:false, isComplete:false};
			} else if (!this.Cells[i].IsFull) {
				isComplete = false;	
			}
		}
		
		for (var i = 0; i < this.Dots.length; i++) {
			if (!this.Dots[i].IsValid()) {
				return {isValid:false, isComplete:false};
			} else if (!this.Dots[i].IsFull) {
				isComplete = false;	
			}
		}
		
		if (isComplete) {
			return {isValid:true, isComplete:true};
		} else {
			return {isValid:!this.FindSubLoop(), isComplete:false};
		}
	},
	
	ClearGuesses: function() {
		var marks = {lines:[], xs:[]};
		for (var i = 0; i < this.Marks.length; i++) {
			var mark = this.Marks[i];
			if (mark.IsBasedOnGuess) {
				if (mark.IsMarked && mark.IsLine) {
					marks.lines[mark.Id] = true;	
				} else if (mark.IsMarked && !mark.IsLine) {
					marks.xs[mark.Id] = true;	
				}
				
				mark.ClearMark();
			}
		}
		
		for (var i = 0; i < this.Cells.length; i++) {
			var cell = this.Cells[i];
			cell.Side = cell.SideBeforeGuess;
		}
		
		this.JustChangedMarks = [];
		return marks;
	},
};