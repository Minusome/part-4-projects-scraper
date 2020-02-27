const pupper = require("puppeteer");
const { parse } = require("json2csv");

(async () => {
  // Scrap uoa website and return a list of {title, description, supervisor... e.t.c}
  try {
    let browser = await pupper.launch({ headless: true });
    let page = await browser.newPage();
    await page.goto(
      "https://part4project.foe.auckland.ac.nz/home/projects/ece/"
    );
    let projects = await page.evaluate(() => {
      let elements = Array.from(
        document.querySelectorAll(
          "div.d-sm-flex.justify-content-between > a.h4"
        )
      );
      return elements.map(e => e.href);
    });
    let result = [];
    for (let project of projects) {
      await page.goto(project);
      let info = await page.evaluate(() => {
        let title = document.querySelector("h3.mr-auto.pr-2").innerText;
        let description = document.querySelector("p:nth-of-type(2)").innerText;
        let contentInListForm = {};
        for (let list of [
          "Supervisor",
          "Specialisations",
          "Categories",
          "Co-supervisor",
          "Team"
        ]) {
          contentInListForm[list.toLocaleLowerCase().replace("-", "")] = $(
            `h4:contains('${list}')`
          )
            .next("ul")
            .children()
            .get()
            .map(e => e.innerText)
            .filter(e => e !== "");
        }
        let allocated = !$("div.break-word")
          .contents()
          .filter(function() {
            return this.nodeType == Node.TEXT_NODE;
          })
          .text()
          .includes("nallocated");
        return {
          title,
          description,
          ...contentInListForm, // specialisation, categories, prereqs, cosupervisors
          allocated
        };
      });
      result.push(info);
    }
    await browser.close();
    return result;
  } catch (e) {
    return e;
  }
})()
  .then(cancer => {
    // Turn {title, description, supervisor... e.t.c} into a csv
    const csv = parse(cancer, {
      fields: [
        "title",
        "description",
        // Need to support comma delimiters in arrays because Notion.so is dumb
        {
          label: "supervisor",
          value: (row, field) => row[field.label].join(",")
        },
        {
          label: "specialisations",
          value: (row, field) => row[field.label].join(",")
        },
        {
          label: "categories",
          value: (row, field) => row[field.label].join(",")
        },
        {
          label: "cosupervisor",
          value: (row, field) => row[field.label].join(",")
        },
        {
          label: "team",
          value: (row, field) => row[field.label].join(",")
        },
        "allocated"
      ]
    });
    console.log(csv);
  })
  // Shit broke
  .catch(console.error);
