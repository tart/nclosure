#!node

var spawn = require('child_process').spawn,
    fs = require('fs'),
    Script = process.binding('evals').Script;

run();

function run() {
  // Only support one file at the moment, this needs attention
  var fileToCompile = process.argv[2];
  var fileContents = fs.readFileSync(fileToCompile, encoding='utf8');
  var tmpFileName = fileToCompile.replace('.js', '.tmp.js');  
  var bashInst = createTmpFile(tmpFileName, fileContents);
  var parsed = parseFileContentsForCompilerArgs(fileContents);
  var compiledFileName = tmpFileName.replace('.tmp.js', '.min.js')
  var fileToCompileIgnore = fileToCompile.replace('.js', '.ignorejs');
  fs.renameSync(fileToCompile, fileToCompileIgnore);  
  
  runCompiler(tmpFileName, compiledFileName, bashInst, parsed, function() {
    fs.unlinkSync(tmpFileName);    
    fs.renameSync(fileToCompileIgnore, fileToCompile);
  });  
};

function createTmpFile(tmpFileName, code) {  
  var bashInst = code.indexOf('#!node');
  var hasInst = bashInst >= 0;
  var bashInst = null;
  
  if (hasInst) {    
    var endIdx = code.indexOf('\n', bashInst) + 1;
    bashInst = code.substring(bashInst, endIdx);
    code = code.substring(endIdx);
  }
  var newCode = 'goog.require(\'node.goog\');' +
    (hasInst ? '\n' : '') + 
    code;
  fs.writeFileSync(tmpFileName, newCode, encoding='utf8');  
  return bashInst;
};

function parseFileContentsForCompilerArgs(code) {
  var regex = /var\s+([\w\d^=\s]+)\s*=\s*require\(\s*['"]goog['"]\s*\)\s*\.\s*goog/gm
  var m = regex.exec(code);
  var err = 'Could not find a call to goog.init in the specified file.';
  if (!m) throw new Error(err);  
  var varName = m[1].trim();
  var regespStr = varName + '\\s*\\.\\s*init\\s*\\(\\s*({[^}]*})';  
  regex = new RegExp(regespStr, 'gm');
  var m = regex.exec(code);  
  if (!m) throw new Error(err);
  var optsString = m[1];  
  Script.runInThisContext('var opts = ' + optsString);
  if (!opts) throw new Error(err);  
  return opts;
};

function runCompiler(tmpFileToCompile, compiledFileName, bashInstructions, args, callback) {  
  var pathIdx = tmpFileToCompile.lastIndexOf('/');
  var path = pathIdx > 0 ? tmpFileToCompile.substring(0, pathIdx) : '.';
  var clArgs = [
    '--input=' + tmpFileToCompile,
    '--root=' + args.closureBasePath + '/../..',
    '--root=' + path,    
    '--root=lib',    
    '--output_mode=compiled',
    '--compiler_jar=' + (args.compiler_jar || 'lib/compiler.jar'),
    '--compiler_flags=--compilation_level=ADVANCED_OPTIMIZATIONS',
    '--compiler_flags=--js=' + args.closureBasePath + '/deps.js',
    '--compiler_flags=--externs=lib/node.externs.js',
    '--compiler_flags=--output_wrapper="(function() {this.window=this;%output%})();"',
    '--compiler_flags=--debug=true',
    '--compiler_flags=--process_closure_primitives=true',
    '--compiler_flags=--warning_level=VERBOSE',    
    '--compiler_flags=--jscomp_warning=accessControls',
    '--compiler_flags=--jscomp_warning=checkRegExp',
    '--compiler_flags=--jscomp_warning=checkTypes',
    '--compiler_flags=--jscomp_warning=checkVars',
    '--compiler_flags=--jscomp_warning=deprecated',
    '--compiler_flags=--jscomp_warning=fileoverviewTags',
    '--compiler_flags=--jscomp_warning=invalidCasts',
    '--compiler_flags=--jscomp_warning=missingProperties',
    '--compiler_flags=--jscomp_warning=nonStandardJsDocs',
    '--compiler_flags=--jscomp_warning=strictModuleDepCheck',
    '--compiler_flags=--jscomp_warning=undefinedVars',
    '--compiler_flags=--jscomp_warning=unknownDefines',
    '--compiler_flags=--summary_detail_level=3'    
  ];
  if (args.additionalCompileOptions) {
    args.additionalCompileRoots.forEach(function(opt) {      
      clArgs.push('--compiler_flags=' + opt);
    });
  }
  if (args.additionalCompileRoots) {
    args.additionalCompileRoots.forEach(function(root) {      
      clArgs.push('--root=' + root);
    });
  } else if (args.additionalDeps) { 
    // Only try to guess roots if additionalCompileRoots not specified
    args.additionalDeps.forEach(function(dep) {      
      clArgs.push('--root=' + dep + '/..');
    });
  }

  var exec = args.closureBasePath + '../bin/build/closurebuilder.py';  
  var closurebuilder  = spawn(exec, clArgs);
  var output = '';
  var err = '';
  closurebuilder.stdout.on('data', function (data) {
    output += data;
  });

  closurebuilder.stderr.on('data', function (data) {
    err += data;
  });
  
  closurebuilder.on('uncaughtException', function (err) {
    if (callback) callback();
    throw err;
  });

  closurebuilder.on('exit', function (code) {        
    if (callback) callback();
    
    if (code !== 0) {
      console.log('CODE: ' + code + ' ERROR: ' + err + '\n\n\nOUTPUT: ' + output); 
    } else {
      output = (bashInstructions || '') + output;
      fs.writeFileSync(compiledFileName, output, encoding='utf8');              
      console.log(err + '\nSuccessfully compiled to: ' + compiledFileName);
    }    
  });
};