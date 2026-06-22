const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const executeJS = (code, input, timeoutMs = 3000) => {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const scriptFile = path.join(
      tmpDir,
      `codedraft_js_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.js`
    );

    // Mock stdin reading inside Node child process synchronously
    const wrappedCode = `
const fs = require('fs');
const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function(fd, options) {
  if (fd === 0 || fd === '/dev/stdin') {
    return ${JSON.stringify(input || "")};
  }
  return originalReadFileSync.apply(this, arguments);
};
try {
  ${code}
} catch (err) {
  console.error(err.stack || err.message);
  process.exit(1);
}
`;

    try {
      fs.writeFileSync(scriptFile, wrappedCode, "utf-8");
      const startTime = Date.now();

      exec(
        `node --max-old-space-size=128 "${scriptFile}"`,
        { timeout: timeoutMs, killSignal: "SIGKILL" },
        (err, stdout, stderr) => {
          const executionTime = Date.now() - startTime;
          try {
            fs.unlinkSync(scriptFile);
          } catch (_) {}

          if (err && err.killed) {
            resolve({
              success: false,
              output: "",
              executionTime: 0,
              error: `Time limit exceeded. Execution timed out after ${timeoutMs}ms.`,
            });
            return;
          }

          resolve({
            success: !err,
            output: (stdout || "").trim(),
            executionTime,
            error: stderr ? stderr.trim() : err ? err.message : null,
          });
        }
      );
    } catch (e) {
      try {
        fs.unlinkSync(scriptFile);
      } catch (_) {}
      resolve({
        success: false,
        output: "",
        executionTime: 0,
        error: e.message,
      });
    }
  });
};

const executePython = (code, input, timeoutMs = 10000) => {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const scriptFile = path.join(
      tmpDir,
      `codedraft_py_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.py`
    );
    const inputFile = path.join(
      tmpDir,
      `codedraft_in_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`
    );

    try {
      fs.writeFileSync(scriptFile, code, "utf-8");
      fs.writeFileSync(inputFile, input || "", "utf-8");

      const startTime = Date.now();
      let pythonCmd = "python";

      exec(
        `${pythonCmd} "${scriptFile}" < "${inputFile}"`,
        { timeout: timeoutMs, killSignal: "SIGKILL" },
        (err, stdout, stderr) => {
          const executionTime = Date.now() - startTime;
          try {
            fs.unlinkSync(scriptFile);
          } catch (_) {}
          try {
            fs.unlinkSync(inputFile);
          } catch (_) {}

          if (err && err.killed) {
            resolve({
              success: false,
              output: "",
              executionTime: 0,
              error: `Time limit exceeded. Execution timed out after ${timeoutMs}ms.`,
            });
            return;
          }

          resolve({
            success: !err,
            output: (stdout || "").trim(),
            executionTime,
            error: stderr ? stderr.trim() : err ? err.message : null,
          });
        }
      );
    } catch (e) {
      try {
        fs.unlinkSync(scriptFile);
      } catch (_) {}
      try {
        fs.unlinkSync(inputFile);
      } catch (_) {}
      resolve({
        success: false,
        output: "",
        executionTime: 0,
        error: e.message,
      });
    }
  });
};

const executeCPP = (code, input, timeoutMs = 10000) => {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const baseName = `codedraft_cpp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const cppFile = path.join(tmpDir, `${baseName}.cpp`);
    const exeFile = path.join(tmpDir, `${baseName}.exe`);
    const inputFile = path.join(tmpDir, `${baseName}_in.txt`);

    try {
      fs.writeFileSync(cppFile, code, "utf-8");
      fs.writeFileSync(inputFile, input || "", "utf-8");

      exec(
        `g++ -O3 -std=c++17 "${cppFile}" -o "${exeFile}"`,
        { timeout: 15000 },
        (compileErr, compileStdout, compileStderr) => {
          if (compileErr) {
            try {
              fs.unlinkSync(cppFile);
            } catch (_) {}
            try {
              fs.unlinkSync(inputFile);
            } catch (_) {}
            resolve({
              success: false,
              output: "",
              executionTime: 0,
              error: compileStderr ? compileStderr.trim() : compileErr.message,
            });
            return;
          }

          const startTime = Date.now();
          exec(
            `"${exeFile}" < "${inputFile}"`,
            { timeout: timeoutMs, killSignal: "SIGKILL" },
            (runErr, stdout, stderr) => {
              const executionTime = Date.now() - startTime;
              try {
                fs.unlinkSync(cppFile);
              } catch (_) {}
              try {
                fs.unlinkSync(exeFile);
              } catch (_) {}
              try {
                fs.unlinkSync(inputFile);
              } catch (_) {}

              if (runErr && runErr.killed) {
                resolve({
                  success: false,
                  output: "",
                  executionTime: 0,
                  error: `Time limit exceeded. Execution timed out after ${timeoutMs}ms.`,
                });
                return;
              }

              resolve({
                success: !runErr,
                output: (stdout || "").trim(),
                executionTime,
                error: stderr ? stderr.trim() : runErr ? runErr.message : null,
              });
            }
          );
        }
      );
    } catch (e) {
      try {
        fs.unlinkSync(cppFile);
      } catch (_) {}
      try {
        fs.unlinkSync(exeFile);
      } catch (_) {}
      try {
        fs.unlinkSync(inputFile);
      } catch (_) {}
      resolve({
        success: false,
        output: "",
        executionTime: 0,
        error: e.message,
      });
    }
  });
};

const executeC = (code, input, timeoutMs = 10000) => {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const baseName = `codedraft_c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const cFile = path.join(tmpDir, `${baseName}.c`);
    const exeFile = path.join(tmpDir, `${baseName}.exe`);
    const inputFile = path.join(tmpDir, `${baseName}_in.txt`);

    try {
      fs.writeFileSync(cFile, code, "utf-8");
      fs.writeFileSync(inputFile, input || "", "utf-8");

      exec(
        `gcc -O3 "${cFile}" -o "${exeFile}"`,
        { timeout: 15000 },
        (compileErr, compileStdout, compileStderr) => {
          if (compileErr) {
            try {
              fs.unlinkSync(cFile);
            } catch (_) {}
            try {
              fs.unlinkSync(inputFile);
            } catch (_) {}
            resolve({
              success: false,
              output: "",
              executionTime: 0,
              error: compileStderr ? compileStderr.trim() : compileErr.message,
            });
            return;
          }

          const startTime = Date.now();
          exec(
            `"${exeFile}" < "${inputFile}"`,
            { timeout: timeoutMs, killSignal: "SIGKILL" },
            (runErr, stdout, stderr) => {
              const executionTime = Date.now() - startTime;
              try {
                fs.unlinkSync(cFile);
              } catch (_) {}
              try {
                fs.unlinkSync(exeFile);
              } catch (_) {}
              try {
                fs.unlinkSync(inputFile);
              } catch (_) {}

              if (runErr && runErr.killed) {
                resolve({
                  success: false,
                  output: "",
                  executionTime: 0,
                  error: `Time limit exceeded. Execution timed out after ${timeoutMs}ms.`,
                });
                return;
              }

              resolve({
                success: !runErr,
                output: (stdout || "").trim(),
                executionTime,
                error: stderr ? stderr.trim() : runErr ? runErr.message : null,
              });
            }
          );
        }
      );
    } catch (e) {
      try {
        fs.unlinkSync(cFile);
      } catch (_) {}
      try {
        fs.unlinkSync(exeFile);
      } catch (_) {}
      try {
        fs.unlinkSync(inputFile);
      } catch (_) {}
      resolve({
        success: false,
        output: "",
        executionTime: 0,
        error: e.message,
      });
    }
  });
};

module.exports = {
  executeJS,
  executePython,
  executeCPP,
  executeC,
};
