import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
const server = spawn("python", ["-m", "http.server", "8165", "--bind", "127.0.0.1", "--directory", "dist"], { stdio: "ignore" });
let browser;
try {
  let ready=false;
  for(let i=0;i<50;i++){try{if((await fetch("http://127.0.0.1:8165")).ok){ready=true;break;}}catch{} await pause(100);}
  if(!ready) throw Error("Static preview did not start");
  browser=await chromium.launch();
  await mkdir("dist/qa",{recursive:true});
  const reports=[];
  for(const [name,width,height] of [["desktop",1440,1000],["mobile",390,844]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:"reduce"});
    const page=await context.newPage();
    const errors=[]; page.on("pageerror",e=>errors.push(e.message));
    await page.goto("http://127.0.0.1:8165",{waitUntil:"networkidle"});
    await page.evaluate(()=>document.fonts.ready);
    await expect(page.getByRole("heading",{level:1})).toContainText("A little market.");
    if(!(await page.locator(".hero-image img").evaluate(img=>img.complete&&img.naturalWidth>0)))throw Error("Missing hero");
    await page.getByRole("button",{name:"Add California Roll to pickup plan",exact:true}).click();
    await page.getByRole("button",{name:"Open pickup plan, 1 items",exact:true}).click();
    await expect(page.getByRole("dialog").locator(".pickup-summary")).toContainText("$7.99");
    await page.getByRole("dialog").getByRole("button",{name:"Add one California Roll",exact:true}).click();
    await expect(page.getByRole("dialog").locator(".pickup-summary")).toContainText("$15.98");
    await page.getByRole("dialog").getByRole("button",{name:"Remove one California Roll",exact:true}).click();
    await expect(page.getByRole("dialog").locator(".pickup-summary")).toContainText("$7.99");
    await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Decrease California Roll quantity",exact:true}).click();
    await expect(page.getByRole("button",{name:"Open pickup plan, 0 items",exact:true})).toBeVisible();
    await page.reload({waitUntil:"networkidle"});
    await expect(page.getByRole("button",{name:"Open pickup plan, 0 items",exact:true})).toBeVisible();
    await expect(page.getByRole("heading",{level:1})).toHaveCSS("user-select","none");
    await expect(page.getByLabel("Search the menu",{exact:true})).toHaveCSS("user-select","text");

    await page.getByRole("button",{name:"Try the catering planner",exact:true}).click();
    await page.getByLabel("Your name",{exact:true}).fill("Demo Guest");
    await page.getByLabel("Email address",{exact:true}).fill("demo@example.com");
    await page.getByLabel("Event date",{exact:true}).fill(new Date(Date.now()+604800000).toISOString().slice(0,10));
    await page.getByLabel("Number of guests",{exact:true}).fill("12");
    await page.getByRole("button",{name:"Save demo inquiry",exact:true}).click();
    await expect(page.getByText("Saved in this browser’s demo only.",{exact:false})).toBeVisible();
    await page.getByRole("button",{name:"Close the demo planner",exact:true}).click();
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error(name+" overflow");
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze();
    const failures=audit.violations.filter(v=>["serious","critical"].includes(v.impact));
    if(failures.length||errors.length)throw Error(JSON.stringify({failures,errors}));
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:"dist/qa/"+name+".png",fullPage:true});
    reports.push({viewport:name,status:"passed",seriousAccessibilityIssues:0,checks:["local pickup estimate","decrease quantities in drawer and menu","removal persists after reload","page selection disabled and fields editable","browser-only inquiry","hero loaded","no horizontal overflow"]});
    await context.close();
  }
  await writeFile("dist/qa/report.json",JSON.stringify(reports,null,2));
  console.log(JSON.stringify(reports));
}finally{if(browser)await browser.close();server.kill("SIGTERM");}
