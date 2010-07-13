/*!
 * CLEditor - WYSIWYG HTML Editor
 * version: 1.1 (7/13/2010)
 * @requires jQuery v1.4.2 or later
 *
 * Copyright 2010, Chris Landowski, Premium Software, LLC
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * CLEditor is a simple lightweight jQuery Rich Text (WYSIWYG)
 * HTML editor plugin.
 */
 
(function($) {

  //==========
  // Constants
  //==========

  // Toolbar buttons [image index, title, command, parm]
  var buttons = {
    bold:           [0, "Bold", "bold"],
    italic:         [1, "Italic", "italic"],
    underline:      [2, "Underline", "underline"],
    strikethrough:  [3, "Strikethrough", "strikethrough"],
    subscript:      [4, "Subscript", "subscript"],
    superscript:    [5, "Superscript", "superscript"],
    font:           [6, "Font", "fontname"],
    size:           [7, "Font Size", "fontsize"],
    style:          [8, "Style", "formatblock"],
    color:          [9, "Font Color", "forecolor"],
    highlight:      [10, "Text Highlight Color", "hilitecolor"],
    removeformat:   [11, "Remove Formatting", "removeformat"],
    bullets:        [12, "Bullets", "insertunorderedlist"],
    numbering:      [13, "Numbering", "insertorderedlist"],
    outdent:        [14, "Outdent", "outdent"],
    indent:         [15, "Indent", "indent"],
    alignleft:      [16, "Align Text Left", "justifyleft"],
    center:         [17, "Center", "justifycenter"],
    alignright:     [18, "Align Text Right", "justifyright"],
    justify:        [19, "Justify", "justifyfull"],
    undo:           [20, "Undo", "undo"],
    redo:           [21, "Redo", "redo"],
    rule:           [22, "Insert Horizontal Rule", "inserthorizontalrule"],
    image:          [23, 'Insert Image', 'insertimage'],
    link:           [24, 'Insert Hyperlink', 'createlink'],
    unlink:         [25, 'Remove Hyperlink', 'unlink'],
    cut:            [26, "Cut", "cut", 1],
    copy:           [27, "Copy", "copy", 1],
    paste:          [28, "Paste", "paste", 1],
    print:          [29, "Print", "print"],
    html:           [30, "Show HTML"]
  };

  //==========
  // Variables
  //==========

  // Popups are created once and shared by all editor instances
  var $colorPopup, $fontPopup, $sizePopup, $stylePopup, documentClickAssigned;

  //============
  // Constructor
  //============

  $.cleditor = function(areaID, options) {

    // Define defaults and override with options
    settings = $.extend({
      name:         "cleditor", // name to use when referencing this editor via javascript
      width:        500, // width not including margins, borders or padding
      height:       250, // height not including margins, borders or padding
      controls:     // controls to add to the toolbar
                    "bold italic underline strikethrough subscript superscript | font size " +
                    "style | color highlight removeformat | bullets numbering | outdent " +
                    "indent | alignleft center alignright justify | undo redo | rule image " +
                    "link unlink | cut copy paste | print html",
      colors:       // colors listed in the color popup
                    "FFFFFF FFCCCC FFCC99 FFFF99 FFFFCC 99FF99 99FFFF CCFFFF CCCCFF FFCCFF " +
                    "CCCCCC FF6666 FF9966 FFFF66 FFFF33 66FF99 33FFFF 66FFFF 9999FF FF99FF " +
                    "C0C0C0 FF0000 FF9900 FFCC66 FFFF00 33FF33 66CCCC 33CCFF 6666CC CC66CC " +
                    "999999 CC0000 FF6600 FFCC33 FFCC00 33CC00 00CCCC 3366FF 6633FF CC33CC " +
                    "666666 990000 CC6600 CC9933 999900 009900 339999 3333FF 6600CC 993399 " +
                    "333333 660000 993300 996633 666600 006600 336666 000099 333399 663366 " +
                    "000000 330000 663300 663333 333300 003300 003333 000066 330099 330033",    
      fonts:        // font names listed in the font popup
                    "Arial,Arial Black,Comic Sans MS,Courier New,Narrow,Garamond," +
                    "Georgia,Impact,Sans Serif,Serif,Tahoma,Trebuchet MS,Verdana",
      sizes:        // sizes listed in the font size popup
                    "1,2,3,4,5,6,7",
      styles:       // styles listed onafterprint the style popup
                    [['Paragraph', '<p>'], ['Header 1', '<h1>'], ['Header 2', '<h2>'],
                    ['Header 3', '<h3>'],  ['Header 4','<h4>'],  ['Header 5','<h5>'],
                    ['Header 6','<h6>']],
      mainClass:    "cleditorMain", // class name assigned to the main containing div
      toolbarClass: "cleditorToolbar", // class name assigned to the toolbar div
      groupClass:   "cleditorGroup", // class name assigned to each group div in the toolbar div
      buttonClass:  "cleditorButton", // class name assigned to each button
      dividerClass: "cleditorDivider", // class name assigned to each group divider
      bodyStyle:    // style to assign to document body contained within the editor
                    "margin:4px; font:10pt Arial,Verdana; cursor:text"
    }, options);

    // Check for IE6
    var ie6 = /msie\s6/.test(navigator.userAgent.toLowerCase());

    // Hide the textarea used to communicate with the server
    var $area = $("#" + areaID)
      .hide()
      .keyup($.proxy(this.updateFrame, this))
      .mouseup($.proxy(this.updateFrame, this));
        
    // Create the main div used to contain all editor elements and controls
    var $main = $("<div>")
      .insertBefore($area)
      .addClass(settings.mainClass)
      .width(settings.width)
      .height(settings.height);

    // Create the toolbar which consists of
    // groups of buttons and dividers.
    var $toolbar = $("<div>")
      .appendTo($main)
      .addClass(settings.toolbarClass);

    var $group = $("<div>")
      .appendTo($toolbar)
      .addClass(settings.groupClass);
    
    var wid = 0;

    $.each(settings.controls.split(" "), $.proxy(function(buttonIDx, buttonID) {

      // Divider
      if (buttonID == "|") {

        // Add a new divider to the group
        var $div = $("<div>")
          .appendTo($group)
          .addClass(settings.dividerClass);

        // Set the group width
        wid += $div.width();
        $group.width(wid);

        // Create a new group
        $group = $("<div>")
          .appendTo($toolbar)
          .addClass(settings.groupClass);
        wid = 0;
      }

      // Button
      else if (buttons[buttonID]) {
        
        // Add a new button to the group
        var pos = (buttons[buttonID][0]) * -24;
        var $btn = $("<div>")
          .appendTo($group)
          .addClass(settings.buttonClass)
          .attr("title", buttons[buttonID][1])
          .css("background-position", pos + "px")
          .bind('click', {buttonID: buttonID}, $.proxy(buttonClick, this));

        // Update the width
        wid += $btn.width();
        $group.width(wid);

        // 
        if ($.browser.msie) $btn.attr("unselectable", "on");

        // Create the font popup
        if (buttonID == "font" && $fontPopup === undefined)
          createFontPopup();

        // Create the size popup
        if (buttonID == "size" && $sizePopup === undefined)
          createSizePopup();

        // Create the style popup
        if (buttonID == "style" && $stylePopup === undefined)
          createStylePopup();

        // Create the color popup
        if ((buttonID == "color" || buttonID == "highlight") && $colorPopup === undefined)
          createColorPopup();
        
      }

    }, this));

    // Add the hover effect to all toolbar buttons
    $main.find("." + settings.buttonClass).hover(
      function() {$(this).css({backgroundColor: "#ffffff"});},
      function() {$(this).css({backgroundColor: "transparent"});}
    );

    // Append the textarea to the main div
    $area.appendTo($main);

    // Create an iframe used for wysiwyg editing
    var $frame = $('<iframe frameborder="0" src="javascript:true;">')
      .appendTo($main);

    // Load the iframe content
    var doc = $frame[0].contentWindow.document;
    doc.open();
    doc.write('<html><body style="' + settings.bodyStyle + '">' + $area.val() + '</body></html>');
    doc.close();

    // Switch the iframe into design mode (ie6 does not support designMode)
    if (ie6) doc.body.contentEditable = true;
    else doc.designMode = "on";

    // Keep iframe and textarea insync
    $(doc).keyup($.proxy(this.updateTextArea, this));
    $(doc).mouseup($.proxy(this.updateTextArea, this));

    // Update the new object and add it to the DOM
    this.$main = $main;
    this.$toolbar = $toolbar;
    this.$area = $area;
    this.$frame = $frame;
    this.settings = settings;
    this.doc = doc;
    this.ie6 = ie6;
    window[settings.name] = this;

    // Add a resize event handler to the window and resize the toolbar
    if (/auto|%/.test("" + settings.width + settings.height))
      $(window).resize($.proxy(this.resizeControls, this));
    this.resizeControls();

    // Add a document.click event handler to dismiss popups
    if (documentClickAssigned === undefined) {
      $(document).click(documentClick);
      $(doc).click(documentClick);
      documentClickAssigned = true;
    }

  };

  //===============
  // Public Methods
  //===============

  // execCommand - executes a designmode command
  $.cleditor.prototype.execCommand = function(command, val) {
    this.doc.execCommand(command, 0, val);
    this.updateTextArea();
  }

  // focus - Sets focus to either the textarea or iframe
  $.cleditor.prototype.focus = function() {
    setTimeout($.proxy(function() {
      if (this.htmlMode()) this.$area.focus();
      else this.$frame[0].contentWindow.focus();
    }, this), 0);
  };

  // htmlMode - Returns true if the textarea is showing and the iframe is hidden
  $.cleditor.prototype.htmlMode = function() {
    return this.$frame.css("display") == "none";
  };

  // resize - resizes the toolbar, textarea and iframe
  $.cleditor.prototype.resizeControls = function() {

    // Update the toolbar height
    var $toolbar = this.$toolbar;
    var $group = $toolbar.find("div:last");
    var hgt = $group.offset().top + $group.outerHeight() - $toolbar.offset().top + 1;
    $toolbar.height(hgt);

    // Resize the textarea and iframe. IE6 textareas have a 1px
    // top & bottom margin that cannot be removed using css.
    var wid = this.$main.width();
    if (/%/.test("" + settings.height)) hgt = this.$main.height() - hgt;
    else hgt = parseInt(this.settings.height) - hgt;
    this.$frame.width(wid).height(hgt);
    this.$area.width(wid).height(this.ie6 ? hgt - 2 : hgt);

  };

  // select - Selects all the text in either the textarea or iframe
  $.cleditor.prototype.select = function() {
    setTimeout($.proxy(function() {
      if (this.htmlMode()) this.$area.select();
      else this.execCommand("selectall", null);
    }, this), 0);
  };

  // selectedText - returns the current text selection or and empty string
  $.cleditor.prototype.selectedText = function() {
    if ($.browser.msie) return this.doc.selection.createRange().text;
    return this.$frame[0].contentWindow.getSelection();
  };

  // updateFrame - Updates the iframe with the textarea contents
  $.cleditor.prototype.updateFrame = function() {
    $(this.doc.body).html(this.$area.val());
  };

  // updateTextArea - Updates the textarea with the iframe contents
  $.cleditor.prototype.updateTextArea = function() {
    this.$area.val($(this.doc.body).html());
  };

  //===============
  // Event Handlers
  //===============

  // buttonClick - click event handler for toolbar buttons
  function buttonClick(e) {

    // 'this' is the editor containing the clicked button
    // e.target is the clicked button
    // e.data.buttonID is the ID of the clicked button
    var buttonID = e.data.buttonID,
        htmlMode = this.htmlMode(),
        parms = buttons[buttonID];

    // Toggle html
    if (buttonID == "html") {

      // Show the iframe
      if (htmlMode) {
        this.$area.hide();
        this.$frame.show();
        e.target.title = "Show HTML";
      }

      // Show the textarea
      else {
        this.$frame.hide();
        this.$area.show();
        e.target.title = "Show Rich Text";
      }

    }

    else if (!htmlMode) {
      var url;

      // Font
      if (buttonID == "font")
        showPopup(e, this, $fontPopup);

      // Font Size
      else if (buttonID == "size")
        showPopup(e, this, $sizePopup);

      // Style
      else if (buttonID == "style")
        showPopup(e, this, $stylePopup);

      // Font Color & Highlight
      else if (buttonID == "color" || buttonID == "highlight")
        showPopup(e, this, $colorPopup);

      // Image
      else if (buttonID == "image") {
        url = prompt("Enter Image URL:", "http://");
        if (url !== null && url != '')
          this.execCommand(parms[2], url);
      }

      // Link
      else if (buttonID == "link") {
        if (this.selectedText() == "") {
          alert("A selection is required when inserting a link.");
          this.focus();
          return;
        }
        url = prompt("Enter Link URL:", "http://");
        if (url !== null && url != '')
          this.execCommand(parms[2], url);
      }

      // Print
      else if (buttonID == "print")
        this.$frame[0].contentWindow.print();

      // Handle all other buttons
      else if (!htmlMode)
        this.execCommand(parms[2], parms[3] || null);

    }

    // Check for formatting button when textarea is showing
    else alert("'" + buttons[buttonID][1] + "' not allowed in HTML view.");

    // Focus the visible control
    this.focus();

  }
  
  // documentClick - click event handler for the document
  function documentClick(e) {
    // Hide the popup when the user clicks outside of the button
    hidePopup($colorPopup);
    hidePopup($fontPopup);
    hidePopup($sizePopup);
    hidePopup($stylePopup);
  }

  // popupClick - click event handler for popup items
  function popupClick(e) {

    // 'this' is the editor that triggered the popup
    // e.target is the clicked item
    // e.data.buttonID is the ID of the clicked button
    // e.data.$popup is popup that was clicked

    if (!this.htmlMode()) {

      // Execute the command
      var val, command = buttons[e.data.buttonID][2];
      if (command == "fontname")
        val = e.target.style.fontFamily;
      else if (command == "fontsize")
        val = e.target.innerHTML;
      else if (command == "formatblock")
        val = "<" + e.target.tagName + ">";
      else if (command == "forecolor")
        val = e.target.style.backgroundColor;
      else if (command == "hilitecolor") {
        val = e.target.style.backgroundColor;
        if ($.browser.msie)
          command = 'backcolor';
        else {
          this.execCommand("styleWithCSS", "true");
          this.execCommand(command, val);
          this.execCommand("styleWithCSS", "false");
          this.focus();
          return;
        }
      }
      this.execCommand(command, val);
      this.focus();

    }
  }

  // popupEnter - mouseenter event handler for popup items
  function popupEnter(e) {
    // e.target is the clicked item
    while (e.target.tagName != "DIV") e.target = e.target.parentNode;
    $(e.target).css("backgroundColor", "#FFFFCC");
  }

  // popupLeave - mouseleave event handler for popup items
  function popupLeave(e) {
    // e.target is the clicked item
    while (e.target.tagName != "DIV") e.target = e.target.parentNode;
    $(e.target).css("backgroundColor", "#FFFFFF");
  }

  //================
  // Private Methods
  //================

  // createPopup - creates a popup and adds it to the body
  function createPopup(options) {

    // Define defaults and override with options
    var settings = $.extend({
      className: "cleditorPopup",
      hover: true
    }, options);

    // Create the popup
    var $popup = $("<div>")
      .appendTo("body")
      .hide()
      .css("z-index", "0")
      .addClass(settings.className);

    // Add the hover effect to all future items
    if (settings.hover) {
      $popup.addClass("cleditorHover");
      $(".cleditorPopup.cleditorHover *")
        .live("mouseenter", $.proxy(popupEnter, this))
        .live("mouseleave", $.proxy(popupLeave, this));
    }

    // Add the unselectable attribute for ie after the items have been created
    if ($.browser.msie) setTimeout(function() {
      $popup.find("div,font,p,h1,h2,h3,h4,h5,h6").attr("unselectable", "on");
    }, 0);

    // Return the popup
    return $popup;

  }

  // createColorPopup - create the color popup
  function createColorPopup() {
    
    // Create the popup
    $colorPopup = createPopup({className: "cleditorColors", hover: false});

    // Create the popup items
    var $div;
    $.each(settings.colors.split(" "), function(idx, color) {
      $div = $("<div>")
        .appendTo($colorPopup)
        .css("backgroundColor", "#" + color);
    });

  }

  // createFontPopup - creates the font popup
  function createFontPopup() {

    // Create the popup
    $fontPopup = createPopup();

    // Create the popup items
    var $div;
    $.each(settings.fonts.split(","), function(idx, font) {
      $div = $("<div>")
        .appendTo($fontPopup)
        .css("font-family", font)
        .html(font);
    });

  }

  // createSizePopup - creates the size popup
  function createSizePopup() {

    // Create the popup
    $sizePopup = createPopup();

    // Create the item divs
    var $div;
    $.each(settings.sizes.split(","), function(idx, size) {
      $div = $("<div>")
        .appendTo($sizePopup)
        .html("<font size=" + size + ">" + size + "</font>");
    });

  }

  // createStylePopup - creates the style popup
  function createStylePopup() {

    // Create the popup
    $stylePopup = createPopup();

    // Create the item divs
    var $div;
    $.each(settings.styles, function(idx, style) {
      $div = $("<div>")
        .appendTo($stylePopup)
        .html(style[1] + style[0] + style[1].replace("<", "</"));
    });

  }

  // hidePopup - hides a popup
  function hidePopup($popup) {
    if ($popup !== undefined && $popup.button !== undefined) {
      $popup.unbind("click").hide();
      $popup.button = undefined;
    }
  }

  // showPopup - shows a popup
  function showPopup(e, editor, $popup) {
    // e.target is the clicked button
    // e.data.buttonID is the ID of the clicked button
    // Show the popup if hidden or attached to another button
    if ($popup.button === undefined || e.target != $popup.button) {
      documentClick(e); // Hide all popups
      var $button = $(e.target);
      var offset = $button.offset();
      $popup.css({left: --offset.left + "px", top: (offset.top + $button.height()) + "px"})
        .bind("click", {$popup: $popup, buttonID: e.data.buttonID}, $.proxy(popupClick, editor))
        .show();
      $popup.button = e.target;
      e.stopPropagation();
    }
  }

})(jQuery);
