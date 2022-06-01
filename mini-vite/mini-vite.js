const Koa = require("koa");
const fs = require("fs");
const path = require("path");
const compilerSFC = require("@vue/compiler-sfc");
const compilerDOM = require("@vue/compiler-dom");

const app = new Koa()

app.use(async ctx => {
  const { url, query } = ctx.request;
  if(url === '/') {
    ctx.type = "text/html";
    ctx.body = fs.readFileSync(path.join(__dirname, "./index.html"), "utf8");
  } else if (url.endsWith(".js")) {
    const p = path.join(__dirname, url);
    // console.log(p);
    ctx.type = "application/javascript";
    ctx.body = rewriteImport(fs.readFileSync(p, "utf8"));
  } else if (url.startsWith("/@modules/")) {
    const moduleName = url.replace("/@modules/", "");
    // console.log(`moduleName ${moduleName}`);
    const prefix = path.join(__dirname, "../node_modules", moduleName);
    // console.log(`prefix: ${prefix}`);
    const module = require(prefix + "/package.json").module;
    // console.log(`module: ${module}`);
    const filePath = path.join(prefix, module);
    const ret = fs.readFileSync(filePath, "utf8");
    ctx.type = "application/javascript";
    ctx.body = rewriteImport(ret);
  } else if (url.indexOf(".vue") > -1) {
    const p = path.join(__dirname, url.split("?")[0]);
    const ret = compilerSFC.parse(fs.readFileSync(p, "utf-8"));
    if (!query.type) {
      // console.log(`ret ${JSON.stringify(ret, null, 2)}`);
      const scriptContent = ret.descriptor.script.content;
      const script = scriptContent.replace("export default ", "const __script = ");
      ctx.type = "application/javascript";
      ctx.body = `
        import '${url}?type=style'
        ${rewriteImport(script)}  
        //  compile template
        import { render as __render} from '${url}?type=template'
        __script.render = __render
        export default __script
      `;
    } else if (query.type === "template") {
      const tpl = ret.descriptor.template.content;
      const render = compilerDOM.compile(tpl, { mode: "module" }).code;
      ctx.type = "application/javascript";
      ctx.body = rewriteImport(render);
    } else if (query.type === "style") {
      const stylesArr = ret.descriptor.styles;
      const styles = stylesArr.reduce(
        (ret, current) => ret + current.content,
        ""
      );
      ctx.type = "application/javascript";
      ctx.body = `
        const style = document.createElement('style')
        style.setAttribute('type', 'text/css')
        style.innerHTML = \`${styles}\`
        document.head.appendChild(style)
      `;
    }
  }

});

function rewriteImport(content) {
  return content.replace(/ from ['"](.*)['"]/g, function (s1, s2) {
    if (s2.startsWith("./") || s2.startsWith("/") || s2.startsWith("../")) {
      return s1;
    } else {
      return ` from '/@modules/${s2}'`;
    }
  });
}

app.listen(3000, () => {
    console.log('mini-vite startup!');
});
