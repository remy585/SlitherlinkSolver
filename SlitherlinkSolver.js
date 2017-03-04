// TODO: perhaps cells should have a list of dots, and dots should have a list of cells?
// TODO: Does the validity checker look for loops?
// TODO: Make the validity checker only look at cells/marks/corners directly around the change?
// TODO: guesses only re-itterate through the marks that didn't fail out early the last time
// TODO: time each guess and report on average guess times?
// TODO: perhaps aGuessHasBeenMade should be a global variable instead of passing it around all the time?

var SLSolver = {
	// Parent object of Cell and Dot. Handles logic of keeping track of Marks
	MarkableObject: function() {
		this.Marks = [];
		this.NumLines = 0;
		this.NumXs = 0;
		this.NumUnmarked = 0;
		this.IsFull = false;
		
		// Adds a mark to this object
		// TODO: What if mark is coming in pre-marked? Need to update counts...
		this.AddMark = function(mark) {
			this.Marks[this.Marks.length] = mark;
			this.NumUnmarked++;
		};
		
		// Checks if this object contains the mark
		this.ContainsMark = function(mark) {
			for (var i = 0; i < this.Marks.length; i++) {
				if (this.Marks[i].Id == mark.Id) return true;
			}
			
			return false;
		};
		
		// Called when one of the marks is marked as a line
		this.LineAdded = function() {
			this.NumLines++;
			this.IsFull = this.NumLines + this.NumXs == this.Marks.length;
			this.NumUnmarked--;
		};
		
		// Called when one of the marks is marked as an x
		this.XAdded = function() {
			this.NumXs++;
			this.IsFull = this.NumLines + this.NumXs == this.Marks.length;
			this.NumUnmarked--;
		};
		
		// Called when one of the line marks is un-marked
		this.LineErased = function() {
			this.NumLines--;
			this.IsFull = this.NumLines + this.NumXs == this.Marks.length;
			this.NumUnmarked++;
		};
		
		// Called when one of the x marks is un-marked
		this.XErased = function() {
			this.NumXs--;
			this.IsFull = this.NumLines + this.NumXs == this.Marks.length;
			this.NumUnmarked++;
		};
	},
	
	// Defines the object that represents a puzzle cell that may or maynot have a number inside of it and that, in the end, will be surrounded by lines or 'x's.
	// Child of MarkableObject
	Cell: function(id, value) {
		this.__proto__ = new SLSolver.MarkableObject();
		this.Id = id;
		this.Value = value; // Could be a number or null
		this.Side = -1; // as in "inside" or "outside"
		this.SideBeforeGuess = -1;
		
		// Checks if this cell is valid. Can only check validity if the cell has a value
		this.IsValid = function() {
			return !(this.Value != null && (this.NumLines > this.Value || this.Marks.length - this.NumXs < this.Value));
		};
		
		// Sets the side of this cell
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
		
		// A dot is valid if there are 0 lines, 2 lines, or 1 line with one or more empty spaces
		this.IsValid = function() {
			return !(this.NumLines > 2 || (this.NumLines == 1 && this.IsFull));
		};
	},
	
	// Defines the object that, at the end of the puzzle, will be either a line or an 'x'
	Mark: function(id) {
		this.Id = id;
		this.Cells = []; // should have 1 or 2 cells
		this.Dots = [];  // should have exactly 2 dots
		this.IsMarked = false;
		this.IsLine = false;
		this.IsBasedOnGuess = false;
		
		// return the companion side to the specified side
		// 0 and 1 go together, 2 and 3 go together etc
		// this function is also in the parent Solver object, but I couldn't figure out how to make this object talk to those external functions
		this.GetOppositeSide = function(side) {
			if (side % 2 == 0) {
				return side + 1;	
			} else {
				return side - 1;	
			}
		};
		
		// Add a dot to this mark
		this.AddDot = function(dot) {
			this.Dots[this.Dots.length] = dot;
		};
		
		// Add a cell to this mark
		this.AddCell = function(cell) {
			this.Cells[this.Cells.length] = cell;
		};
		
		// checks if the mark contains the specified dot
		this.ContainsDot = function(dot) {
			for (var i = 0; i < this.Dots.length; i++) {
				if (this.Dots[i].Id == dot.Id) return true;
			}
			
			return false;
		};
		
		// checks if the cell contains thte specified cell
		this.ContainsCell = function(cell) {
			for (var i = 0; i < this.Cells.length; i++) {
				if (this.Cells[i].Id == cell.Id) return true;
			}
			
			return false;
		};
		
		// returns the other cell that's associated with this mark that's not the specified cell
		// if the mark only has one cell, then it returns null
		this.TheOtherCell = function(cell) {
			for (var i = 0; i < this.Cells.length; i++) {
				if (this.Cells[i].Id != cell.Id) return this.Cells[i];	
			}
			
			return null;	
		};
		
		// returns the other dot that's associated with this mark that's not the specified dot
		this.TheOtherDot = function(dot) {
			for (var i = 0; i < this.Dots.length; i++) {
				if (this.Dots[i].Id != dot.Id) return this.Dots[i];
			}
			
			// should never be null
			return null;	
		};
		
		// mark this mark as a line
		// currentSidePairCount is maintianed by the solver
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
		
		// mark this mark as an x
		// currentSidePairCount is maintianed by the solver
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
		
		// erase this mark if it was marked
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
	
	Cells: [],
	Dots: [],
	Marks: [],
	NumMarkedMarks: 0,
	MaxGuessingDepthReached: -1,
	ChangeMade: false,
	SidePairCount: 0,
	JustChangedMarks: [], // this is used when guessing so that subsequent logic rules can just look at the changed areas, and therefore be faster
	
	// Solve the board as far as we can go using logic
	// takes a board object that contains {Cells, Dots, Marks}
	// if step is true only makes one logical step
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
	
	// Runs all the logic rules I know without making any guesses
	// Returns as soon as one of the logic rules results in a change
	RunBasicLogic: function(aGuessHasBeenMade) {
		var changeMade = this.CompleteCells(aGuessHasBeenMade) ||
						 this.CompleteDots(aGuessHasBeenMade) ||
						 this.ApplySideLogic(aGuessHasBeenMade) ||
						 this.KeepLoopsOpen(aGuessHasBeenMade);
		
		return changeMade;
	},
	
	// Goes through all the cells and checks if you can make any moves based on the cell's value
	// For example:
	// This will mark all the marks around a cell with a "0" value with 'x's
	// This will mark the last un-marked mark of a cell with a "1" value with a line if all the other marks are 'x's
	CompleteCells: function(aGuessHasBeenMade) {
		var changeMade = false;
		for (var i = 0; i < this.Cells.length; i++) {
			var cell = this.Cells[i];
			
			if (!cell.IsFull && cell.Value != null) {
				// mark the rest x's
				if (cell.Value == cell.NumLines) {
					for (var m = 0; m < cell.Marks.length; m++) {
						var mark = cell.Marks[m];
						if (!mark.IsMarked) {
							this.MarkX(mark, aGuessHasBeenMade);
							changeMade = true;
						}
					}
				}
			
				// mark the rest lines
				if (cell.Value == cell.Marks.length - cell.NumXs) {
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
	
	// Goes through all the dots and checks if you can make any moves based on the fact that a completed dot can either have 0 or 2 lines
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
				} else if (dot.NumLines == 1 && dot.NumXs == dot.Marks.length - 2) {
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
	
	// if the cell's an outside cell (Side == 0) and on the edge, mark an x
	// if the cells an inside cell (Side == 1) and on the edge, mark a line
				
	// if the cells on either side of a mark are the same, mark an x
	// if the cells on either side of a mark are different (but in the same side family), mark a line
				
	// using a cell's value and the counts of various sides valuse of it's neighbors we can make some marks
	// for example: 
	// if a cell with 4 sides and a value of 3 has 2 or more neighbors with the same side value, mark lines between the cell and those neighbors
	ApplySideLogic: function(aGuessHasBeenMade) {
		var changeMade = false;
		
		// fill arrays of what cells and marks to apply this logic on using JustChangedMarks
		// if there's nothing in JustChangedMarks (meaning we haven't been guessing) then check everything
		// this check shaves 2 minutes off of a tricky puzzle
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
		
		// Set side based on counts of side values in neighboring cells
		for (var i = 0; i < cellIdsToCheck.length; i++) {
			if (cellIdsToCheck[i] && this.Cells[i].Value != null && !this.Cells[i].IsFull) {
				var cell = this.Cells[i];
				var sideCounts = [];
				for (var j = 0; j < cell.Marks.length; j++) {
					var otherCell = cell.Marks[j].TheOtherCell(cell);
					var otherSide = otherCell != null ? otherCell.Side : 0;
					if (otherSide > -1) {
						if (!sideCounts[otherSide]) {
							sideCounts[otherSide] = 0;
						} 
						
						sideCounts[otherSide]++;
					}
				}
				
				// if there are more than cell.Value cells adjacent to this one with the same side value, then this cell must be on the same side
				// if there are more than numSides - value cells adjacent to this one with the same side value, then this cell must be on the opposite side
				for (var j = 0; j < sideCounts.length; j++) {
					if (sideCounts[j]) {
						var sideCount = sideCounts[j];
						if (sideCount > cell.Value) {
							cell.SetSide(j, aGuessHasBeenMade);
						} else if ((cell.Marks.length - cell.Value) < sideCount) {
							cell.SetSide(this.GetOppositeSide(j), aGuessHasBeenMade);
						}
					}
				}
			}
		}
		
		// draw x's between same sidded cells, and lines between opposite sidded cells
		for (var i = 0; i < markIdsToCheck.length; i++) {
			if (markIdsToCheck[i] && !this.Marks[i].IsMarked) {
				var mark = this.Marks[i];
				var side1 = 0;
				var side2 = mark.Cells[0].Side;
				if (mark.Cells.length > 1) {
					side1 = Math.min(mark.Cells[0].Side, mark.Cells[1].Side);
					side2 = Math.max(mark.Cells[0].Side, mark.Cells[1].Side);
				}
				
				if (side1 > -1 && side2 > -1) {
					if (side1 == side2 || 
					   (side2 == 0 && side1 == 0)) {
						// if the cells on either side are the same, mark an x
						this.MarkX(mark, aGuessHasBeenMade);
						changeMade = true;
					} else if (side1 != side2 && side2 - side1 == 1 && side1 % 2 == 0) {
						// if the cells on either side are different (but in the same side family), mark a line
						this.MarkLine(mark, aGuessHasBeenMade);
						changeMade = true;
					}
				}
			}
		}
			
		return changeMade;
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
	
	// Goes through the un-marked marks and tries a line or an x in that spot
	// Then makes as many basic logic moves (no more guesses) as it can and checks if the board is in a valid state
	// If the board is not valid, you know that the mark must be the oposite of whatever guess you put there
	// If both mark types result in a valid board, look at the subsequent logic marks that were made, 
	//   if there were any that were the same either way, go ahead and make those changes
	// This is slow
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
	
	// run the basic logic rules after a guess has been made until there are no more moves to make
	// keeps track of the moves made
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
	
	// looks for loops in the marked lines, returns true if a loop has been found
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
	
	// If the startingDot has no lines coming out of it, returns startingDot
	// Follows the lines and returns the last Dot it comes to, or in the case of a loop returns startingDot, but dotsTouched will have more than one dot id in it
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
			
			// move currentDot
			currentDot = nextLine.TheOtherDot(currentDot);
			lastLine = nextLine;
			
			if (currentDot == startingDot) {
				// this dot is part of a loop
				return {lastDot:currentDot, dotsTouched:dotsTouched};
			}
		}
	},
	
	// marks the specified mark as a line
	// also does some updating to the current SidePairCount for assigning sides to cells if we don't know yet if they're inside or outside
	MarkLine: function(mark, aGuessHasBeenMade) {
		if (aGuessHasBeenMade) {
			this.JustChangedMarks.push(mark);
		}
		
		this.SidePairCount = mark.MarkLine(aGuessHasBeenMade, this.SidePairCount);
	},
	
	// marks the specified mark as an x
	// also does some updating to the current SidePairCount for assigning sides to cells if we don't know yet if they're inside or outside
	MarkX: function(mark, aGuessHasBeenMade) {
		if (aGuessHasBeenMade) {
			this.JustChangedMarks.push(mark);
		}
		
		this.SidePairCount = mark.MarkX(aGuessHasBeenMade, this.SidePairCount);
	},
	
	// Checks if the current board state is valid
	// returns {isValid, isComplete}
	// looks at all the cells and sees if they're valid,
	// looks at all the dots and sees if they're valid too
	// if this determines that all the marks are marked will return isComplete:true
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
	
	// reverts the board back to it's pre-guess state
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
	
	// return the companion side to the specified side
	// 0 and 1 go together, 2 and 3 go together etc
	GetOppositeSide: function(side) {
		if (side % 2 == 0) {
			return side + 1;	
		} else {
			return side - 1;	
		}
	}
};