const vm = require("vm");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const executeJS = (code, input, timeoutMs = 3000) => {
  const logs = [];
  const sandbox = {
    console: {
      log: (...args) => {
        logs.push(
          args
            .map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)))
            .join(" ")
        );
      },
      error: (...args) => {
        logs.push(args.join(" "));
      },
    },
    require: (moduleName) => {
      if (moduleName === "fs") {
        return {
          readFileSync: (fd) => {
            if (fd === 0 || fd === "/dev/stdin") {
              return input;
            }
            throw new Error("Only standard input (FD 0) reading is permitted");
          },
        };
      }
      throw new Error(`Module ${moduleName} is not permitted in the sandbox`);
    },
    process: {
      stdout: {
        write: (data) => {
          logs.push(String(data));
        },
      },
      exit: () => {
        throw new Error("process.exit() is disabled in the sandbox");
      },
    },
  };

  try {
    const script = new vm.Script(code);
    const context = vm.createContext(sandbox);
    const startTime = Date.now();
    script.runInContext(context, { timeout: timeoutMs });
    const executionTime = Date.now() - startTime;
    const output = logs.join("\n").trim();
    return {
      success: true,
      output,
      executionTime,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      output: logs.join("\n").trim(),
      executionTime: 0,
      error: err.message,
    };
  }
};

const executePython = (code, input, timeoutMs = 10000) => {
  const tmpDir = os.tmpdir();
  const scriptFile = path.join(tmpDir, `codedraft_py_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.py`);
  const inputFile = path.join(tmpDir, `codedraft_in_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`);

  try {
    fs.writeFileSync(scriptFile, code, "utf-8");
    fs.writeFileSync(inputFile, input || "", "utf-8");

    const startTime = Date.now();
    // Try python3 first, fall back to python
    let pythonCmd = "python";
    try {
      execSync("python3 --version", { stdio: "ignore" });
      pythonCmd = "python3";
    } catch (_) {
      // python3 not found, use python
    }

    const stdout = execSync(`${pythonCmd} "${scriptFile}" < "${inputFile}"`, {
      timeout: timeoutMs,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const executionTime = Date.now() - startTime;
    return {
      success: true,
      output: (stdout || "").trim(),
      executionTime,
      error: null,
    };
  } catch (err) {
    // execSync throws on non-zero exit code
    const stderr = err.stderr ? err.stderr.toString().trim() : "";
    const stdout = err.stdout ? err.stdout.toString().trim() : "";
    return {
      success: false,
      output: stdout,
      executionTime: 0,
      error: stderr || err.message,
    };
  } finally {
    // Cleanup temp files
    try { fs.unlinkSync(scriptFile); } catch (_) {}
    try { fs.unlinkSync(inputFile); } catch (_) {}
  }
};

const executeCPP = (code, input, timeoutMs = 10000) => {
  const tmpDir = os.tmpdir();
  const baseName = `codedraft_cpp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const cppFile = path.join(tmpDir, `${baseName}.cpp`);
  const exeFile = path.join(tmpDir, `${baseName}.exe`);
  const inputFile = path.join(tmpDir, `${baseName}_in.txt`);

  try {
    fs.writeFileSync(cppFile, code, "utf-8");
    fs.writeFileSync(inputFile, input || "", "utf-8");

    // Compile C++ code
    execSync(`g++ -O3 -std=c++17 "${cppFile}" -o "${exeFile}"`, {
      timeout: 15000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const startTime = Date.now();
    const stdout = execSync(`"${exeFile}" < "${inputFile}"`, {
      timeout: timeoutMs,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const executionTime = Date.now() - startTime;
    return {
      success: true,
      output: (stdout || "").trim(),
      executionTime,
      error: null,
    };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : "";
    const stdout = err.stdout ? err.stdout.toString().trim() : "";
    return {
      success: false,
      output: stdout,
      executionTime: 0,
      error: stderr || err.message,
    };
  } finally {
    try { fs.unlinkSync(cppFile); } catch (_) {}
    try { fs.unlinkSync(exeFile); } catch (_) {}
    try { fs.unlinkSync(inputFile); } catch (_) {}
  }
};

const executeC = (code, input, timeoutMs = 10000) => {
  const tmpDir = os.tmpdir();
  const baseName = `codedraft_c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const cFile = path.join(tmpDir, `${baseName}.c`);
  const exeFile = path.join(tmpDir, `${baseName}.exe`);
  const inputFile = path.join(tmpDir, `${baseName}_in.txt`);

  try {
    fs.writeFileSync(cFile, code, "utf-8");
    fs.writeFileSync(inputFile, input || "", "utf-8");

    // Compile C code
    execSync(`gcc -O3 "${cFile}" -o "${exeFile}"`, {
      timeout: 15000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const startTime = Date.now();
    const stdout = execSync(`"${exeFile}" < "${inputFile}"`, {
      timeout: timeoutMs,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const executionTime = Date.now() - startTime;
    return {
      success: true,
      output: (stdout || "").trim(),
      executionTime,
      error: null,
    };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : "";
    const stdout = err.stdout ? err.stdout.toString().trim() : "";
    return {
      success: false,
      output: stdout,
      executionTime: 0,
      error: stderr || err.message,
    };
  } finally {
    try { fs.unlinkSync(cFile); } catch (_) {}
    try { fs.unlinkSync(exeFile); } catch (_) {}
    try { fs.unlinkSync(inputFile); } catch (_) {}
  }
};

module.exports = {
  executeJS,
  executePython,
  executeCPP,
  executeC,
};
