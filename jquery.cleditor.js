/**
 @preserve CLEditor WYSIWYG HTML Editor v1.2
 http://premiumsoftware.net/cleditor
 requires jQuery v1.4.2 or later

 Copyright 2010, Chris Landowski, Premium Software, LLC
 Dual licensed under the MIT or GPL Version 2 licenses.
*/

// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// @output_file_name jquery.cleditor.min.js
// ==/ClosureCompiler==

(function($) {

  //==============
  // jQuery Plugin
  //==============

  $.cleditor = {

    // Define the defaults used for all new cleditor instances
    defaultOptions: {
      width:        500, // width not including margins, borders or padding
      height:       250, // height not including margins, borders or padding
      controls:     // controls to add to the toolbar
                    "bold italic underline strikethrough subscript superscript | font size " +
                    "style | color highlight removeformat | bullets numbering | outdent " +
                    "indent | alignleft center alignright justify | undo redo | " +
                    "rule image link unlink | cut copy paste | print html",
      colors:       // colors in the color popup
                    "FFFFFF FFCCCC FFCC99 FFFF99 FFFFCC 99FF99 99FFFF CCFFFF CCCCFF FFCCFF " +
                    "CCCCCC FF6666 FF9966 FFFF66 FFFF33 66FF99 33FFFF 66FFFF 9999FF FF99FF " +
                    "C0C0C0 FF0000 FF9900 FFCC66 FFFF00 33FF33 66CCCC 33CCFF 6666CC CC66CC " +
                    "999999 CC0000 FF6600 FFCC33 FFCC00 33CC00 00CCCC 3366FF 6633FF CC33CC " +
                    "666666 990000 CC6600 CC9933 999900 009900 339999 3333FF 6600CC 993399 " +
                    "333333 660000 993300 996633 666600 006600 336666 000099 333399 663366 " +
                    "000000 330000 663300 663333 333300 003300 003333 000066 330099 330033",    
      fonts:        // font names in the font popup
                    "Arial,Arial Black,Comic Sans MS,Courier New,Narrow,Garamond," +
                    "Georgia,Impact,Sans Serif,Serif,Tahoma,Trebuchet MS,Verdana",
      sizes:        // sizes in the font size popup
                    "1,2,3,4,5,6,7",
      styles:       // styles in the style popup
                    [["Paragraph", "<p>"], ["Header 1", "<h1>"], ["Header 2", "<h2>"],
                    ["Header 3", "<h3>"],  ["Header 4","<h4>"],  ["Header 5","<h5>"],
                    ["Header 6","<h6>"]],
      useCSS:       false, // use CSS to style HTML when possible (not supported in ie)
      bodyStyle:    // style to assign to document body contained within the editor
                    "margin:4px; font:10pt Arial,Verdana; cursor:text"
    },

    // Define all usable toolbar buttons - the init string property is 
    //   expanded during initialization back into the buttons object and 
    //   seperate object properties are created for each button.
    //   e.g. buttons.size.title = "Font Size"
    buttons: {
      // name,title,command,popupName (""=use name)
      init:
      "bold,,|" +
      "italic,,|" +
      "underline,,|" +
      "strikethrough,,|" +
      "subscript,,|" +
      "superscript,,|" +
      "font,,fontname,|" +
      "size,Font Size,fontsize,|" +
      "style,,formatblock,|" +
      "color,Font Color,forecolor,|" +
      "highlight,Text Highlight Color,hilitecolor,color|" +
      "removeformat,Remove Formatting,|" +
      "bullets,,insertunorderedlist|" +
      "numbering,,insertorderedlist|" +
      "outdent,,|" +
      "indent,,|" +
      "alignleft,Align Text Left,justifyleft|" +
      "center,,justifycenter|" +
      "alignright,Align Text Right,justifyright|" +
      "justify,,justifyfull|" +
      "undo,,|" +
      "redo,,|" +
      "rule,Insert Horizontal Rule,inserthorizontalrule|" +
      "image,Insert Image,insertimage,url|" +
      "link,Insert Hyperlink,createlink,url|" +
      "unlink,Remove Hyperlink,|" +
      "cut,,|" +
      "copy,,|" +
      "paste,,|" +
      "print,,|" +
      "html,Show HTML"
    },

    // imagesPath - returns the path to the images folder
    imagesPath: function() { return imagesPath(); }

  };

  // cleditor - creates a new editor for each of the matched textareas
  $.fn.cleditor = function(options) {

    // Create a new jQuery object to hold the results
    var $result = $([]);

    // Loop through all matching textareas and create the editors
    this.each(function() {
      if (this.tagName == "TEXTAREA") {
        var data = $(this).data(CLEDITOR);
        if (!data) $result = $result.add(new cleditor(this, options));
        else $result = $result.add(data);
      }
    });

    // return the new jQuery object
    return $result;

  };
    
  //==================
  // Private Variables
  //==================

  var

  // Misc constants
  BACKGROUND_COLOR = "backgroundColor",
  BUTTON           = "button",
  BUTTON_NAME      = BUTTON + "Name",
  CHANGE           = "change",
  CLEDITOR         = "cleditor",
  CLICK            = "click",
  COLOR            = "color",
  DISABLED         = "disabled",
  DIV_TAG          = "<div>",
  FONT             = "font",
  SIZE             = "size",
  STYLE            = "style",
  UNSELECTABLE     = "unselectable",

  // Class name constants
  MAIN_CLASS       = CLEDITOR + "Main",    // main containing div
  TOOLBAR_CLASS    = CLEDITOR + "Toolbar", // toolbar div inside main div
  GROUP_CLASS      = CLEDITOR + "Group",   // group divs inside the toolbar div
  BUTTON_CLASS     = CLEDITOR + "Button",  // button divs inside group div
  DIVIDER_CLASS    = CLEDITOR + "Divider", // divider divs inside group div
  POPUP_CLASS      = CLEDITOR + "Popup",   // popup divs inside body
  LIST_CLASS       = CLEDITOR + "List",    // list popup divs inside body
  COLOR_CLASS      = CLEDITOR + "Color",   // color popup div inside body
  PROMPT_CLASS     = CLEDITOR + "Prompt",  // prompt popup divs inside body
  MSG_CLASS        = CLEDITOR + "Msg",     // message popup div inside body

  // Test for internet explorer 6
  ie6 = /msie\s6/i.test(navigator.userAgent),

  // Popups are created once as needed and shared by all editor instances
  popups = {},

  // Used to prevent the document click event from being bound more than once
  documentClickAssigned,

  // Local copy of the buttons object
  buttons = $.cleditor.buttons;

  //===============
  // Initialization
  //===============

  // Expand the buttons.init string back into the buttons object
  //   and create seperate object properties for each button.
  //   e.g. buttons.size.title = "Font Size"
  $.each(buttons.init.split("|"), function(idx, button) {
    var items = button.split(","), name = items[0];
    buttons[name] = {
      stripIndex: idx,
      name: name,
      title: items[1] == "" ? name.charAt(0).toUpperCase() + name.substr(1) : items[1],
      command: items[2] == "" ? name : items[2],
      popupName: items[3] == "" ? name : items[3]
    };
  });
  delete buttons.init;

  //============
  // Constructor
  //============

  // cleditor - creates a new editor for the passed in textarea element
  cleditor = function(area, options) {

    var editor = this;

    // Get the defaults and override with options
    options = $.extend({}, $.cleditor.defaultOptions, options);

    // Prepare the textarea
    var $area = $(area)
      .hide()
      .data(CLEDITOR, editor)
      .bind("keyup mouseup", function() {updateFrame(editor);});

    // Create the main container and append the textarea
    var $main = $(DIV_TAG)
      .addClass(MAIN_CLASS)
      .width(options.width)
      .height(options.height)
      .insertBefore($area)
      .append($area);

    // Create the toolbar
    var $toolbar = $(DIV_TAG)
      .css({
        backgroundImage: imageUrl("toolbar.gif"),
        backgroundRepeat: "repeat"
      })
      .prependTo($main);

    // Add the first group to the toolbar
    var $group = $(DIV_TAG)
      .addClass(GROUP_CLASS)
      .appendTo($toolbar);
    
    // Add the buttons to the toolbar
    var wid = 0;
    $.each(options.controls.split(" "), function(idx, buttonName) {
      if (buttonName == "") return true;

      // Divider
      if (buttonName == "|") {

        // Add a new divider to the group
        var $div = $(DIV_TAG)
          .addClass(DIVIDER_CLASS)
          .appendTo($group);

        // Set the group width
        $group.width(wid += $div.width());

        // Create a new group
        $group = $(DIV_TAG)
          .addClass(GROUP_CLASS)
          .appendTo($toolbar);
        wid = 0;

      }

      // Button
      else {
        
        // Get the button definition
        var button = buttons[buttonName];

        // Add a new button to the group
        var $buttonDiv = $(DIV_TAG)
          .data(BUTTON_NAME, button.name)
          .addClass(BUTTON_CLASS)
          .attr("title", button.title)
          .bind(CLICK, $.proxy(buttonClick, editor))
          .appendTo($group);

        // Prepare the button image
        if (button.css)
          $buttonDiv.css(button.css);
        else if (button.image)
          $buttonDiv.css({backgroundImage: imageUrl(button.image)});
        else
          $buttonDiv.css({backgroundImage: imageUrl("buttons.gif")});
        if (button.stripIndex)
          $buttonDiv.css({backgroundPosition: button.stripIndex * -24});

        // Update the group width
        $group.width(wid += $buttonDiv.width());

        // Add the unselectable attribute for ie
        if ($.browser.msie)
          $buttonDiv.attr(UNSELECTABLE, "on");

        // Create the popup
        if (button.popupName)
          createPopup(button.popupName, options, button.popupClass,
            button.popupContent, button.popupHover);
        
      }

    });

    // Add the hover effect to all toolbar buttons
    $toolbar.find("." + BUTTON_CLASS).hover(hoverEnter, hoverLeave);

    // Create an iframe used for wysiwyg editing
    var $frame = $('<iframe frameborder="0" src="javascript:true;">')
      .appendTo($main);

    // Load the iframe content
    var doc = $frame[0].contentWindow.document;
    doc.open();
    doc.write('<html><body style="' + options.bodyStyle + '">' + $area.val() + '</body></html>');
    doc.close();

    // Update the new object
    editor.$main = $main;
    editor.$toolbar = $toolbar;
    editor.$area = $area;
    editor.$frame = $frame;
    editor.options = options;
    editor.doc = doc;

    // Switch the iframe into design mode
    disable(editor);

    // Bind the iframe document event handlers
    $(doc)
      .click(hidePopups)
      .bind("keyup mouseup", function() {updateTextArea(editor);});

    // Add a document.click event handler to dismiss all non-prompt popups
    if (!documentClickAssigned) {
      $(document).click(function(e) {
        var $target = $(e.target);
        if (!$target.add($target.parents()).is("." + PROMPT_CLASS))
          hidePopups();
      });
      documentClickAssigned = true;
    }

    // Add a window resize event handler when the width or height is auto or %
    if (/auto|%/.test("" + options.width + options.height))
      $(window).resize(function() {resizeControls(editor);});

    // Resize the controls
    resizeControls(editor);

  };

  //===============
  // Public Methods
  //===============

  var fn = cleditor.prototype,

  // Expose the following private functions as methods on the cleditor object.
  // The closure compiler will rename the private functions. However, the
  // exposed method names on the cleditor object will remain fixed.
  methods = [
    ["clear", clear],
    ["disable", disable],
    ["execCommand", execCommand],
    ["focus", focus],
    ["hidePopups", hidePopups],
    ["htmlMode", htmlMode, true],
    ["resizeControls", resizeControls],
    ["restoreSelection", restoreSelection],
    ["select", select],
    ["selectedText", selectedText, true],
    ["showMessage", showMessage],
    ["updateFrame", updateFrame],
    ["updateTextArea", updateTextArea]
  ];

  $.each(methods, function(idx, method) {
    fn[method[0]] = function() {
      var editor = this, args = [editor];
      // using each here would cast booleans into objects!
      for(var x = 0; x < arguments.length; x++) {args.push(arguments[x]);}
      var result = method[1].apply(editor, args);
      if (method[2]) return result;
      return editor;
    };
  });

  // change - shortcut for .bind("change", handler) or .trigger("change")
  fn.change = function(handler) {
    var $this = $(this);
    return handler ? $this.bind(CHANGE, handler) : $this.trigger(CHANGE);
  };

  //===============
  // Event Handlers
  //===============

  // buttonClick - click event handler for toolbar buttons
  function buttonClick(e) {

    var editor = this,
        buttonDiv = e.target,
        buttonName = $(buttonDiv).data(BUTTON_NAME),
        button = buttons[buttonName],
        popupName = button.popupName,
        popup = popups[popupName];

    // Check if disabled
    if (editor.disabled)
      return;

    // Fire the buttonClick event
    var data = {
      editor: editor,
      button: buttonDiv,
      buttonName: buttonName,
      popup: popup,
      popupName: popupName,
      command: button.command,
      value: null,
      useCSS: editor.options.useCSS
    };

    if (button.buttonClick && button.buttonClick(e, data) === false)
      return false;

    // Toggle html
    if (buttonName == "html") {

      // Show the iframe
      if (htmlMode(editor)) {
        updateFrame(editor);
        editor.$area.hide();
        editor.$frame.show();
        buttonDiv.title = button.title;
      }

      // Show the textarea
      else {
        updateTextArea(editor);
        editor.$frame.hide();
        editor.$area.show();
        buttonDiv.title = "Show Rich Text";
      }

    }

    // Check for rich text mode
    else if (!htmlMode(editor)) {

      // Handle popups
      if (popupName) {
        var $popup = $(popup);

        // URL
        if (popupName == "url") {

          // Check for selection before showing the link url popup
          if (buttonName == "link" && selectedText(editor) == "") {
            showMessage(editor, "A selection is required when inserting a link.", buttonDiv);
            return false;
          }

          // Wire up the submit button click event handler
          $popup.children(":button")
            .unbind(CLICK)
            .bind(CLICK, function(e) {

              // Restore internet explorer selection
              restoreSelection(editor);

              // Insert the image or link if a url was entered
              var $text = $popup.find(":text"),
                url = $.trim($text.val());
              if (url != "")
                execCommand(editor, data.command, url, null, data.button);

              // Reset the text, hide the popup and set focus
              $text.val("http://");
              hidePopups();
              focus(editor);

            });

        }

        // Show the popup if not already showing for this button
        if (buttonDiv !== $(popup).data(BUTTON)) {
          showPopup(editor, popup, buttonDiv);
          return false; // stop propagination to document click
        }

        // propaginate to documnt click
        return;

      }

      // Print
      else if (buttonName == "print")
        editor.$frame[0].contentWindow.print();

      // All other buttons
      else if (!execCommand(editor, data.command, data.value, data.useCSS, buttonDiv))
        return false;

    }

    // Check for button clicks in html mode
    else {
      showMessage(editor, "The '" + button.title + 
      "' button is not allowed when viewing HTML.", buttonDiv);
      return false;
    }

    // Focus the editor
    focus(editor);

  }

  // hoverEnter - mouseenter event handler for buttons and popup items
  function hoverEnter(e) {
    var elem = e.target;
    while (elem.tagName != "DIV") elem = elem.parentNode;
    var $elem = $(elem),
        color = $elem.data(BUTTON_NAME) ? "white" : "#FFFFCC";
    $elem.css(BACKGROUND_COLOR, color);
  }

  // hoverLeave - mouseleave event handler for buttons and popup items
  function hoverLeave(e) {
    var elem = e.target;
    while (elem.tagName != "DIV") elem = elem.parentNode;
    $(elem).css(BACKGROUND_COLOR, "transparent");
  }

  // popupClick - click event handler for popup items
  function popupClick(e) {

    var editor = this,
        popup = e.data.popup,
        $popup = $(popup),
        target = e.target;

    // Check for message and prompt popups
    if (popup === popups.msg || $popup.hasClass(PROMPT_CLASS))
      return;

    // Get the button info
    var buttonDiv = $popup.data(BUTTON),
        buttonName = $(buttonDiv).data(BUTTON_NAME),
        button = buttons[buttonName],
        command = button.command,
        value = null,
        useCSS = editor.options.useCSS;

    // Get the command value
    if (buttonName == FONT)
      value = target.style.fontFamily;
    else if (buttonName == SIZE) {
      if (target.tagName == "DIV")
        target = target.children[0];
      value = target.innerHTML;
    }
    else if (buttonName == STYLE)
      value = "<" + target.tagName + ">";
    else if (buttonName == COLOR)
      value = hex(target.style.backgroundColor);
    else if (buttonName == "highlight") {
      value = hex(target.style.backgroundColor);
      if ($.browser.msie) command = 'backcolor';
      else useCSS = true;
    }

    // Fire the popupClick event
    var data = {
      editor: editor,
      button: buttonDiv,
      buttonName: buttonName,
      popup: popup,
      popupName: button.popupName,
      command: command,
      value: value,
      useCSS: useCSS
    };

    if (button.popupClick && button.popupClick(e, data) === false)
      return;

    // Execute the command
    if (data.command && !execCommand(editor, data.command, data.value, data.useCSS, buttonDiv))
      return false;

    // Hide the popup and focus the editor
    hidePopups();
    focus(editor);

  }

  //==================
  // Private Functions
  //==================

  // clear - clears the contents of the editor
  function clear(editor) {
    editor.$area.val("");
    updateFrame(editor);
  }

  // createPopup - creates a popup and adds it to the body
  function createPopup(popupName, options, popupTypeClass, popupContent, popupHover) {

    // Check if popup already exists
    if (popups[popupName])
      return popups[popupName];

    // Create the popup
    var $popup = $(DIV_TAG)
      .hide()
      .addClass(POPUP_CLASS)
      .appendTo("body");

    // Custom popup
    if (popupContent)
      $popup.html(popupContent);

    // Color
    else if (popupName == COLOR) {
      var colors = options.colors.split(" ");
      if (colors.length < 10)
        $popup.width("auto");
      $.each(colors, function(idx, color) {
        $(DIV_TAG).appendTo($popup)
          .css(BACKGROUND_COLOR, "#" + color);
      });
      popupTypeClass = COLOR_CLASS;
    }

    // Font
    else if (popupName == FONT)
      $.each(options.fonts.split(","), function(idx, font) {
        $(DIV_TAG).appendTo($popup)
          .css("font-family", font)
          .html(font);
      });

    // Size
    else if (popupName == SIZE)
      $.each(options.sizes.split(","), function(idx, size) {
        $(DIV_TAG).appendTo($popup)
          .html("<font size=" + size + ">" + size + "</font>");
      });

    // Style
    else if (popupName == STYLE)
      $.each(options.styles, function(idx, style) {
        $(DIV_TAG).appendTo($popup)
          .html(style[1] + style[0] + style[1].replace("<", "</"));
      });

    // URL
    else if (popupName == "url") {
      $popup.html('Enter URL:<br><input type=text value="http://" size=35><br><input type=button value="Submit">');
      popupTypeClass = PROMPT_CLASS;
    }

    // Add the popup type class name
    if (!popupTypeClass && !popupContent)
      popupTypeClass = LIST_CLASS;
    $popup.addClass(popupTypeClass);

    // Add the unselectable attribute to all items
    if ($.browser.msie) {
      $popup.attr(UNSELECTABLE, "on")
        .find("div,font,p,h1,h2,h3,h4,h5,h6")
        .attr(UNSELECTABLE, "on");
    }

    // Add the hover effect to all items
    if ($popup.hasClass(LIST_CLASS) || popupHover === true)
      $popup.children().hover(hoverEnter, hoverLeave);

    // Add the popup to the array and return it
    popups[popupName] = $popup[0];
    return $popup[0];

  }

  // disable - enables or disables the editor
  function disable(editor, disabled) {

    // Update the textarea and save the state
    if (disabled) {
      editor.$area.attr(DISABLED, DISABLED);
      editor.disabled = true;
    }
    else {
      editor.$area.removeAttr(DISABLED);
      delete editor.disabled;
    }

    // Switch the iframe into design mode.
    // ie6 does not support designMode.
    // ie7 & ie8 do not properly support designMode="off".
    try {
      if ($.browser.msie) editor.doc.body.contentEditable = !disabled;
      else editor.doc.designMode = !disabled ? "on" : "off";
    }
    // Firefox 1.5 throws an exception that can be ignored
    // when toggling designMode from off to on.
    catch (err) {}

  }

  // Returns the hex value for the passed in string.
  //   hex("rgb(255, 0, 0)"); // #FF0000
  //   hex("#FF0000"); // #FF0000
  function hex(c) {
    var m = /rgba?\((\d+), (\d+), (\d+)/.exec(c);
    return m ? '#' + ( m[1] << 16 | m[2] << 8 | m[3] ).toString(16) : c;
  }

  // execCommand - executes a designMode command
  function execCommand(editor, command, value, useCSS, button) {

    // Set the styling method
    if (!$.browser.msie) {
      if (useCSS === undefined || useCSS === null)
        useCSS = editor.options.useCSS;
      editor.doc.execCommand("styleWithCSS", 0, useCSS.toString());
    }

    // Execute the command and check for error
    var success = true, description;
    if (command.toLowerCase() == "inserthtml" && $.browser.msie)
      editor.doc.selection.createRange().pasteHTML(value);
    else {
      try { success = editor.doc.execCommand(command, 0, value || null); }
      catch (err) { description = err.description; success = false; }
      if (!success) {
        if ("cutcopypaste".indexOf(command) > -1)
          showMessage(editor, "For security reasons, your browser does not support the " +
            command + " command. Try using the keyboard shortcut or context menu instead.",
            button);
        else
          showMessage(editor,
            (description ? description : "Error executing the " + command + " command."),
            button);
      }
    }

    // Sync up the textarea
    updateTextArea(editor);
    return success;

  }

  // focus - sets focus to either the textarea or iframe
  function focus(editor) {
    setTimeout(function() {
      if (htmlMode(editor)) editor.$area.focus();
      else editor.$frame[0].contentWindow.focus();
    }, 0);
  }

  // hidePopups - hides all popups
  function hidePopups() {
    $.each(popups, function(idx, popup) {
      $(popup)
        .hide()
        .unbind(CLICK)
        .removeData(BUTTON);
    });
  }

  // htmlMode - returns true if the textarea is showing
  function htmlMode(editor) {
    return editor.$frame.css("display") == "none";
  }

  // imagesPath - returns the path to the images folder
  function imagesPath() {
    var cssFile = "jquery.cleditor.css",
        href = $("link[href$='" + cssFile +"']").attr("href");
    return href.substr(0, href.length - cssFile.length) + "images/";
  }

  // imageUrl - Returns the css url string for a filemane
  function imageUrl(filename) {
    return "url(" + imagesPath() + filename + ")";
  }

  // resizeControls - resizes the toolbar, textarea and iframe
  function resizeControls(editor) {

    // Update the toolbar height
    var $toolbar = editor.$toolbar,
        $group = $toolbar.children("div:last"),
        hgt = $group.offset().top + $group.outerHeight() - $toolbar.offset().top + 1;
    $toolbar.height(hgt);

    // Resize the textarea and iframe. IE6 textareas have a 1px
    // top & bottom margin that cannot be removed using css.
    var wid = editor.$main.width();
    if (/%/.test("" + editor.options.height)) hgt = editor.$main.height() - hgt;
    else hgt = parseInt(editor.options.height) - hgt;
    editor.$frame.width(wid).height(hgt);
    editor.$area.width(wid).height(ie6 ? hgt - 2 : hgt);

  }

  // restoreSelection - restores the current iframe selection
  function restoreSelection(editor) {
    if (editor.range) {
      editor.range.select();
      delete editor.range;
    }
  }

  // select - selects all the text in either the textarea or iframe
  function select(editor) {
    setTimeout(function() {
      if (htmlMode(editor)) editor.$area.select();
      else execCommand(editor, "selectall");
    }, 0);
  }

  // selectedText - returns the current text selection or and empty string
  function selectedText(editor) {
    if ($.browser.msie) return editor.doc.selection.createRange().text;
    return editor.$frame[0].contentWindow.getSelection();
  }

  // showMessage - alert replacement
  function showMessage(editor, message, button) {
    var popup = createPopup("msg", editor.options, MSG_CLASS);
    popup.innerHTML = message;
    showPopup(editor, popup, button);
  }

  // showPopup - shows a popup
  function showPopup(editor, popup, button) {

    var offset, left, top, $popup = $(popup);

    // Determine the popup location
    if (button) {
      var $button = $(button);
      offset = $button.offset();
      left = --offset.left;
      top = offset.top + $button.height();
    }
    else {
      var $toolbar = editor.$toolbar;
      offset = $toolbar.offset();
      left = Math.floor(($toolbar.width() - $popup.width()) / 2) + offset.left;
      top = offset.top + $toolbar.height() - 2;
    }

    // Position and show the popup
    hidePopups();
    $popup.css({left: left, top: top})
      .show();

    // Assign the popup button and click event handler
    if (button) {
      $popup.data(BUTTON, button);
      $popup.bind(CLICK, {popup: popup}, $.proxy(popupClick, editor));
    }

    // Check popup for any input, textarea, select or button elements
    var elem = $popup.find(":text:first")[0];
    if (elem) {

      // Save the current iframe selection for ie since
      // it will be lost when the iframe loses focus.
      if ($.browser.msie)
        editor.range = editor.doc.selection.createRange();

      // Focus the element
      setTimeout(function() {elem.select();elem.focus();}, 100);

    }

  }

  // updateFrame - updates the iframe with the textarea contents
  function updateFrame(editor) {
    
    // Check for change
    var val = editor.$area.val(), $body = $(editor.doc.body);
    if (val != $body.html()) {
    
      // Prevent script injection attacks by html encoding script tags
      val = val.replace(/<(?=\/?script)/ig, "&lt;");
      
      // Update the editor
      $body.html(val);
      $(editor).triggerHandler(CHANGE);

    }
  }

  // updateTextArea - updates the textarea with the iframe contents
  function updateTextArea(editor) {
    var html = $(editor.doc.body).html(), $area = editor.$area;
    if (html != $area.val()) {
      $area.val(html);
      $(editor).triggerHandler(CHANGE);
    }
  }

})(jQuery);
