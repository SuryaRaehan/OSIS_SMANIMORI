const PPT_DB = {
  pengurus: [
    { name: "Profil Kepengurusan.pptx", size: "72 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-5-slides.pptx" },
    { name: "Program Kerja Tahunan.pptx", size: "172 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-20-slides.pptx" },
    { name: "Rapat Evaluasi.pptx", size: "374 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-50-slides.pptx" }
  ],
  1: [
    { name: "Materi Presentasi 1.pptx", size: "72 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-5-slides.pptx" },
    { name: "Materi Presentasi 2.pptx", size: "172 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-20-slides.pptx" },
    { name: "Materi Presentasi 3.pptx", size: "374 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-50-slides.pptx" }
  ],
  2: [
    { name: "Materi Presentasi 1.pptx", size: "170 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-with-charts.pptx" },
    { name: "Materi Presentasi 2.pptx", size: "139 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-with-transitions.pptx" },
    { name: "Materi Presentasi 3.pptx", size: "173 KB", url: "https://cdn.truefilesize.com/powerpoint/business-template.pptx" }
  ],
  3: [
    { name: "Materi Presentasi 1.pptx", size: "72 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-5-slides.pptx" },
    { name: "Materi Presentasi 2.pptx", size: "172 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-20-slides.pptx" },
    { name: "Materi Presentasi 3.pptx", size: "374 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-50-slides.pptx" }
  ],
  4: [
    { name: "Materi Presentasi 1.pptx", size: "170 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-with-charts.pptx" },
    { name: "Materi Presentasi 2.pptx", size: "139 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-with-transitions.pptx" },
    { name: "Materi Presentasi 3.pptx", size: "173 KB", url: "https://cdn.truefilesize.com/powerpoint/business-template.pptx" }
  ],
  5: [
    { name: "Materi Presentasi 1.pptx", size: "72 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-5-slides.pptx" },
    { name: "Materi Presentasi 2.pptx", size: "172 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-20-slides.pptx" },
    { name: "Materi Presentasi 3.pptx", size: "374 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-50-slides.pptx" }
  ],
  6: [
    { name: "Materi Presentasi 1.pptx", size: "170 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-with-charts.pptx" },
    { name: "Materi Presentasi 2.pptx", size: "139 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-with-transitions.pptx" },
    { name: "Materi Presentasi 3.pptx", size: "173 KB", url: "https://cdn.truefilesize.com/powerpoint/business-template.pptx" }
  ],
  7: [
    { name: "Materi Presentasi 1.pptx", size: "72 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-5-slides.pptx" },
    { name: "Materi Presentasi 2.pptx", size: "172 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-20-slides.pptx" },
    { name: "Materi Presentasi 3.pptx", size: "374 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-50-slides.pptx" }
  ],
  8: [
    { name: "Materi Presentasi 1.pptx", size: "170 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-with-charts.pptx" },
    { name: "Materi Presentasi 2.pptx", size: "139 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-with-transitions.pptx" },
    { name: "Materi Presentasi 3.pptx", size: "173 KB", url: "https://cdn.truefilesize.com/powerpoint/business-template.pptx" }
  ],
  9: [
    { name: "Materi Presentasi 1.pptx", size: "72 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-5-slides.pptx" },
    { name: "Materi Presentasi 2.pptx", size: "172 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-20-slides.pptx" },
    { name: "Materi Presentasi 3.pptx", size: "374 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-50-slides.pptx" }
  ],
  10: [
    { name: "Materi Presentasi 1.pptx", size: "170 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-with-charts.pptx" },
    { name: "Materi Presentasi 2.pptx", size: "139 KB", url: "https://cdn.truefilesize.com/powerpoint/sample-with-transitions.pptx" },
    { name: "Materi Presentasi 3.pptx", size: "173 KB", url: "https://cdn.truefilesize.com/powerpoint/business-template.pptx" }
  ]
};

function getPPTFiles(sie) {
  return PPT_DB[sie] || [];
}
function getPPTViewerUrl(file, embed) {
  var base = embed
    ? "https://view.officeapps.live.com/op/embed.aspx?src="
    : "https://view.officeapps.live.com/op/view.aspx?src=";
  return base + encodeURIComponent(file.url);
}
