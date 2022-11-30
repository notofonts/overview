var loaded_blocks = {};
var cdn = "https://cdn.jsdelivr.net/gh/googlefonts/";
function fontname2url(font) {
  var fontpath = window.fontfiles[font];
  fontpath = fontpath.replace("noto-fonts", "noto-fonts@main");
  fontpath = fontpath.replace("noto-cjk", "noto-cjk@main");
  fontpath = fontpath.replace("noto-emoji", "noto-emoji@main");
  return cdn + fontpath;
}

function doModal(block) {
  var myModal = new bootstrap.Modal(document.getElementById("modal"), {});
  $("#modal-title").html(block.name);
  appendFullBlock(block);
  myModal.handleUpdate();
  myModal.show();
}

function loadBlock() {
  var ix = $(this).data("block-id");
  padded = ix.toString().padStart(3, 0);
  filename = `blocks/block-${padded}.json`;
  if (ix in loaded_blocks) {
    doModal(loaded_blocks[ix]);
  } else {
    $.getJSON(filename, function (block) {
      loaded_blocks[ix] = block;
      doModal(loaded_blocks[ix]);
    });
  }
}

function toHex(d) {
  return d.toString(16).toUpperCase().padStart(4, 0);
}

function appendSummaryBlock(ix, mydata) {
  width = 200;
  height = 200;

  var mydiv = $('<div class="pane card p-1">');
  mydiv.data("block-id", mydata.ix);
  mydiv.click(loadBlock);
  $("#panes").append(mydiv);
  if (coveragepercent(mydata) == 1.0) {
    mydiv.addClass("covered");
  } else if (coveragepercent(mydata) == 0.0) {
    mydiv.addClass("empty");
  } else {
    mydiv.addClass("partial");
  }

  var title = $('<div class="title">');
  title.html(`<h5>${mydata.name}</h5>`);
  mydiv.append(title);

  var range = $('<div class="range">');
  range.html(
    `<small class="text-secondary">U+${toHex(mydata.start)}-U+${toHex(
      mydata.end
    )}</small>`
  );
  mydiv.append(range);
  var visualization = $('<div class="py-2">');
  mydiv.append(visualization);

  var svg = d3
    .select(visualization[0])
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g");

  if (mydata.name.includes("CJK Unified Ideographs")) {
    svg.html(
    `<filter id="noise2" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence numOctaves="1" type="fractalNoise"
      baseFrequency="0.3" result="noise"></feTurbulence>
      <feDiffuseLighting result="light" lighting-color="rgb(119,0,0)" surfaceScale="0.2">
        <feDistantLight azimuth="35" elevation="90"></feDistantLight>
      </feDiffuseLighting>
    <feBlend in="noise" in2="light" mode="screen" />
    </filter>`
    );
    svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("filter", "url(#noise2)").attr("rx", 4)
    .attr("ry", 4)
    .style("fill", "#770000");
    svg.append("text").attr("x", 10).attr("y",height/2).style("fill", "white").attr("font-weight", "bold")
    .text("Click to view")
    return;
  }

  var codepoints = mydata.end - mydata.start + 1;
  rows = parseInt(codepoints ** 0.5);
  cols = Math.ceil(codepoints / rows);
  rows_domain = [...Array(rows).keys()];
  cols_domain = [...Array(cols).keys()];
  var summary = mydata.summary.split("");
  data = [];
  var index = 0;
  for (var thing of summary) {
    data.push({
      row: parseInt(index / cols),
      col: index % cols,
      cp: index + mydata.start,
      status: thing,
    });
    index = index + 1;
  }

  myColor = function (status) {
    if (status == "X") {
      return "silver";
    }
    if (status == "1") {
      return "olivedrab";
    }
    if (status == "M") {
      return "darkgreen";
    }
    if (status == "0") {
      return "crimson";
    }
  };
  // Build X scales and axis:
  x = d3.scaleBand().range([0, width]).domain(cols_domain).padding(0.05);

  // Build Y scales and axis:
  y = d3.scaleBand().range([0, height]).domain(rows_domain).padding(0.05);

  // add the squares
  svg
    .selectAll()
    .data(data, function (d) {
      return d.cp;
    })
    .enter()
    .append("rect")
    .attr("x", function (d) {
      return x(d.col);
    })
    .attr("y", function (d) {
      return y(d.row);
    })
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", function (d) {
      return d3.color(myColor(d.status));
    })
    .style("stroke-width", 4)
    .style("stroke", "none")
    .style("opacity", 0.8);
}

function appendFullBlock(mydata) {
  width = 500;
  height = 500;

  var visualization = $("#modal-body");
  $(visualization).empty();
  var svg = d3
    .select(visualization[0])
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g");

  var codepoints = mydata.end - mydata.start + 1;
  rows = parseInt(codepoints ** 0.5);
  cols = Math.ceil(codepoints / rows);
  rows_domain = [...Array(rows).keys()];
  cols_domain = [...Array(cols).keys()];
  data = [];
  var index = 0;
  // console.log(mydata);
  while (index < codepoints) {
    var ix = mydata.start + index;
    var cp = mydata.cps[ix] || { unassigned: "true" };
    if ("fonts" in mydata) {
      fonts = mydata.fonts;
    } else if ("fonts" in cp) {
      fonts = cp.fonts;
    } else {
      fonts = "";
    }
    data.push({
      row: parseInt(index / cols),
      col: index % cols,
      cp: index + mydata.start,
      name: cp.name,
      special: cp.special,
      unassigned: cp.unassigned,
      fonts: fonts,
      value: cp,
      age: mydata.age || cp.age,
    });
    index = index + 1;
  }
  // console.log(data);

  myColor = function (el) {
    if (el.unassigned) {
      return "silver";
    }
    if (el.special) {
      return "black";
    }
    if (el.fonts.length == 1) {
      return "olivedrab";
    }
    if (el.fonts.length > 1) {
      return "darkgreen";
    }
    if (el.fonts.length == 0) {
      return "crimson";
    }
  };

  // create a tooltip
  var tooltip = d3
    .select(visualization[0])
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("padding", "5px");

  // Three function that change the tooltip when user hover / move / leave a cell
  var mouseover = function (d) {
    if (d.unassigned) {
      return;
    }
    tooltip.style("opacity", 1);
    d3.select(this).style("stroke", "black").style("opacity", 1);
  };
  var mousemove = function (d) {
    if (d.unassigned) {
      return;
    }
    tooltip
      .style("left", d3.mouse(this)[0] + 70 + "px")
      .style("top", d3.mouse(this)[1] + 70 + "px");
    if (d.cp == window.oldcp) {
      return;
    }
    window.oldcp = d.cp;
    var start_string;
    if (!d.fonts[0]) {
      start_string = "";
    } else if (window.curfont != d.fonts[0]) {
      start_string = "Loading...";
    } else {
      start_string = String.fromCodePoint(d.cp);
    }
    tooltip.html(
      `
        <h1 id="char" class="center-text noto">${start_string}</h1>
        <dl class="row">
          <dd class="col-sm-3">Codepoint</dd> <dt class="col-sm-9">${toHex(
            d.cp
          )}</dt>
          <dd class="col-sm-3">Name</dd> <dt class="col-sm-9">${d.name}</dt>
          <dd class="col-sm-3">Age</dd>  <dt class="col-sm-9">${d.age}</dt>
          <dd class="col-sm-3">Fonts</dd>  <dt class="col-sm-9">${(
            d.fonts || []
          ).join(", ")}</dt>
        </dl>
      `
    );

    if (d.fonts && window.curfont != d.fonts[0]) {
      setTimeout(function () {
        var thisfont = d.fonts[0];
        // console.log("Loading");
        $("#anotofont").text(`
            @font-face {
               font-family: "Noto ${thisfont}";
               src: url(${fontname2url(thisfont)});
             }
            .noto { font-family: "Noto ${thisfont}", sans-serif; }
          `);
        fontSpy(`Noto ${thisfont}`, {
          glyphs: String.fromCodePoint(d.cp),
          success: function () {
            $("#char").html(String.fromCodePoint(d.cp));
            // console.log("Loaded font " + thisfont);
          },
          failure: function () {
            // console.log("Failed to load font " + thisfont);
            $("#char").html(String.fromCodePoint(d.cp));
          },
        });
        window.curfont = d.fonts[0];
      }, 0);
    }
  };
  var mouseleave = function (d) {
    tooltip.style("opacity", 0);
    d3.select(this).style("stroke", "none").style("opacity", 0.8);
  };

  // Build X scales and axis:
  x = d3.scaleBand().range([0, width]).domain(cols_domain).padding(0.05);

  // Build Y scales and axis:
  y = d3.scaleBand().range([0, height]).domain(rows_domain).padding(0.05);

  // add the squares
  svg
    .selectAll()
    .data(data, function (d) {
      return d.cp;
    })
    .enter()
    .append("rect")
    .attr("x", function (d) {
      return x(d.col);
    })
    .attr("y", function (d) {
      return y(d.row);
    })
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", function (d) {
      return d3.color(myColor(d));
    })
    .style("stroke-width", 4)
    .style("stroke", "none")
    .style("opacity", 0.8)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);
}

function rebuildSummary() {
  $("#panes").empty();
  for (ix in window.summary) {
    appendSummaryBlock(ix, window.summary[ix]);
  }
}

function coveragepercent(summary_block) {
  var len = summary_block.summary.length;
  var missing = (summary_block.summary.match(/0/g) || []).length;
  var there = (summary_block.summary.match(/[1M]/g) || []).length;
  if (!(missing + there)) {
    return 0;
  }
  return there / (missing + there);
}

$(function () {
  $.getJSON("fontfiles.json", function (data) {
    window.fontfiles = data;
    window.curfont = "";
    window.oldcp = 0;
    $.getJSON("blocks.json", function (data) {
      window.summary = data;
      rebuildSummary();
    });
  });
  $("#sort").change(function () {
    if ($("#sort").val() == "alpha") {
      window.summary = window.summary.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    } else if ($("#sort").val() == "coverage") {
      window.summary = window.summary.sort(
        (a, b) => coveragepercent(a) - coveragepercent(b)
      );
    } else {
      window.summary = window.summary.sort((a, b) => a.ix - b.ix);
    }
    rebuildSummary();
  });
});
