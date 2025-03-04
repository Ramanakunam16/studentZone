// importing modules
'use strict';
const stripe = require('stripe')(
  'sk_test_51OxMDMSDSooK0I1kmjADepReYVGo3L377b23vzvq32aitOCDNSdSTJQdcT8ZZtqfcSXFy3ZDQn1dNsu7XDXFRXSI00HCkoyxal'
);
const jwt = require('jsonwebtoken');
const RegistrationPayments = require('./db/models/RegistrationPayments');
const SavedPost = require('./db/models/SavedPost');
const Profile = require('./db/models/Profile');
const Post = require('./db/models/Post');
const expressLayouts = require('express-ejs-layouts');
// const fileUpload = require('express-fileupload');
const express = require('express');
const mysql = require('mysql');
const app = express();
const port = process.env.PORT || 8007;
const bodyParser = require('body-parser');
const lodash = require('lodash');
const { exec } = require('child_process');
const { execSync } = require('child_process');
const node_xlsx = require('node-xlsx').default;
const fs = require('fs');
// const fileUpload = require('express-fileupload');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const csv_parser = require('csv-parser');
require('dotenv').config();
const ejs = require('ejs');
const session = require('express-session');
const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');
const connectMDB = require('./db/config/mdb');

//Storing uploaded files in uploads folder locally.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const extname = path.extname(file.originalname);
    cb(null, Date.now() + extname);
  },
});
const upload = multer({ storage: storage });
const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({ storage: memoryStorage });
// Function to always retrive latest uploaded file from uploads folder
function getlatestUploadedFile(uploadDir) {
  const files = fs.readdirSync(uploadDir);

  if (files.length === 0) {
    return null;
  }

  const sortedFiles = files.map(file => {
    const filePath = path.join(uploadDir, file);
    const stat = fs.statSync(filePath);
    return { file, stat };
  });

  sortedFiles.sort((a, b) => {
    b.stat.mtime.getTime() - b.stat.mtime.getTime();
  });
  return sortedFiles[0].file;
}

// expressjs middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use(fileUpload());
app.use(express.json());
// app.use(fileUpload());
app.set('views', __dirname + '/public/views');
app.set('view engine', 'ejs');
app.use(
  session({
    secret: 'prototype',
    resave: false,
    saveUninitialized: true,
  })
);

// sqlCredentials importing
const sqlDbCredentials = require('./db/sqlDbCredentials.js');

// Function to create db connection
function createDbConnection() {
  return mysql.createConnection(sqlDbCredentials);
}
// connectMDB();
// connectMDB().then(res => console.log(res?.connection._readyState));
// HANDLING HTTP REQUESTS

// app.get('/', (req, res) => {
//   res.render('index');
// });
connectMDB();

app.get('/blogs', isAuthUser, async (req, res) => {
  const { user } = req.session.results;
  // console.log(userData);
  try {
    const data = await Post.find();
    const saved = await SavedPost.find();
    console.log(data);

    // const profile = await Profile.find();

    //db connection
    const mysqlConnection = createDbConnection();

    mysqlConnection.connect(err => {
      if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
      }
      console.log('Connected to MySQL');
    });
    mysqlConnection.query(
      'SELECT * FROM studentProfilePics WHERE user_id=?',
      [user.user_id],
      (err, results) => {
        console.log(results);
        let profilePic = results[0];
        // if (profilePic === null) {
        //   res.render('settings', {
        //     username: user.user_name,
        //     email: user.user_email,
        //     profilePicData: 'profile pic',
        //     profilePicMimeType: 'profile pic',
        //   });
        // } else {
        res.render('blogs', {
          userid: user.user_id,
          email: user.user_email,
          profilePicData: profilePic?.data,
          profilePicMimeType: profilePic?.mime_type,
          data,
          saved,
        });
      }
      // }
    );
  } catch (error) {
    console.log(error);
  }
});
app.get('/reading-list', isAuthUser, async (req, res) => {
  const { user } = req.session.results;
  const data = await Post.find();

  res.render('reading-list', { data, userid: user.user_id });
});
app.get('/write-post', isAuthUser, (req, res) => {
  res.render('writePost');
});
app.get('/blogContent-:id', isAuthUser, async (req, res) => {
  try {
    const slug = req.params.id;
    const data = await Post.findById({ _id: slug });
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.render('blogContent', { data });
  } catch (error) {
    console.log(error);
  }
});
app.get('/profile-:id', isAuthUser, async (req, res) => {
  const slug = req.params.id;
  const profile = await Profile.findById({ _id: slug });
  console.log(profile);
  res.render('profile', { profile });
});

app.get('/results', (req, res) => {
  res.render('results');
});
app.get('/uploadResults', (req, res) => {
  res.render('uploadResults');
});
app.get('/libBookReservation', isAuthUser, (req, res) => {
  res.render('libBookReservation');
});
app.get('/payment', isAuthUser, async (req, res) => {
  res.render('payment');
});
app.get('/semesterReg', isAuthUser, async (req, res) => {
  res.render('semesterRegistration');
});
app.get('/transactions', isAuthUser, async (req, res) => {
  const { user } = req.session.results;
  const data = await RegistrationPayments.find();
  console.log(data);
  res.render('transactions', { data, student_id: user.user_id });
});
app.get('/facultyacctVerify', (req, res) => {
  res.render('facultyacctVerify');
});
app.get('/studentacctVerify', (req, res) => {
  res.render('studentacctVerify');
});
app.get('/login', (req, res) => {
  res.render('signinform');
});
app.get('/studentReservedBooks', isAuthUser, (req, res) => {
  res.render('reservedBooks');
});
app.get('/uploadBooks', (req, res) => {
  res.render('uploadBooks');
});
app.get('/forgotPassword', (req, res) => {
  // const filePath = __dirname + '/public/forgotPassword.html';
  res.render('forgotPassword');
});

// READING HTTP REQUETS

// Adding Results Data File to Database
app.post('/addResults', (req, res) => {
  const body = req.body;
  // body = {
  //   RegistrationNumber: 1,
  //   StudentName: "s1",
  //   semNo: 1,
  //   sgpa: 10,
  //   cs1: 9,
  //   cs2: 10,
  //   cs3: 9,
  //   cs4: 10,
  //   cs5: 9,
  // };
  var student_marks_details = [];
  Object.keys(body).forEach(key => {
    if (key.slice(0, 2) == 'cs') {
      student_marks_details.push([
        body.RegistrationNumber,
        body.semNo,
        key,
        body[key],
      ]);
    }
  });
  console.log(student_marks_details);

  // res.send({});

  // connect to Db
  const mysqlConnection = createDbConnection();

  //handling connection error
  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  // query execution
  mysqlConnection.query(
    'INSERT INTO studentDetails values(?,?,?,?)',
    [body.RegistrationNumber, body.StudentName, body.semNo, body.sgpa],
    (err, results) => {
      if (err) {
        console.log('Invalid query', err);
      } else {
        console.log(results);
      }
    }
  );
  // query execution
  mysqlConnection.query(
    'INSERT INTO studentMarksDetails values ? ',
    [student_marks_details],
    (err, results) => {
      if (err) {
        console.log('Invalid query', err);
      } else {
        console.log(results);
      }
    }
  );
  // End Connection
  mysqlConnection.end();
});
app.post('/studentMarksDetails', (req, res) => {
  const body = req.body;

  // connection to Db
  const mysqlConnection = createDbConnection();

  // query execution

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  // query execution
  mysqlConnection.query(
    'SELECT * FROM studentMarksDetails where sem = ? AND registrationNumber = ?',
    [body.sem, body.registrationNumber],
    (err, results) => {
      if (err) {
        console.log('Invalid query', err);
      } else {
        console.log('smd:', results);
        res.json(results);
      }
    }
  );

  //End Connection
  mysqlConnection.end();
  // // res.json({
  // //   mainData: [
  // //     { registrationNo: 1, semNo: 1, subjectCode: "cs1", gradePoints: 10 },
  // //     { registrationNo: 1, semNo: 1, subjectCode: "cs2", gradePoints: 10 },
  // //     { registrationNo: 1, semNo: 1, subjectCode: "cs3", gradePoints: 10 },
  // //     { registrationNo: 1, semNo: 1, subjectCode: "cs4", gradePoints: 10 },
  // //     { registrationNo: 1, semNo: 1, subjectCode: "cs5", gradePoints: 10 },
  // //   ],
  // });
});

app.post('/studentDetails', (req, res) => {
  const body = req.body;

  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  // excute query
  mysqlConnection.query(
    'SELECT * FROM studentDetails where sem = ? AND registrationNumber = ?',
    [body.sem, body.registrationNumber],
    (err, results) => {
      if (err) {
        console.log('Invalid query', err);
      } else {
        console.log('sd:', results);
        res.json(results);
      }
    }
  );
  //End Connection
  mysqlConnection.end();

  // res.json({
  //   studentDetails: [
  //     { registrationNo: 1, StudentName: "s1", semNo: 1, sGPA: 10 },
  //   ],
  // });
});

//uploading MDB file and reading uploaded file which is stored
app.post('/resultsFileUploadData', (req, res) => {
  // Read excel file
  const workBook = node_xlsx.parse(req.files.resultsFileUpload.data);
  const sheetData = workBook[0].data;
  console.log(req.files.resultsFileUpload.data);
  // const sheetDataColumns = sheetData[0];
  // sheetDataRows = sheetData.slice(1, sheetData.length);

  let mainData = [];
  console.log(mainData);

  const sheetDataLength = sheetData.length;

  for (var i = 1; i < sheetDataLength; i++) {
    let onemainData = {};
    for (var j = 0; j < sheetData[i].length; j++) {
      onemainData[lodash.camelCase(sheetData[0][j])] = sheetData[i][j];
    }
    mainData.push(onemainData);
  }
  //console.log(sheetData[0]);
  console.log(mainData);
  res.send('success');

  var studentResults = [];
  var studentDetails = [];

  for (let i = 0; i < mainData.length; i++) {
    Object.keys(mainData[i]).forEach(key => {
      if (key.slice(0, 2) == 'cs') {
        studentResults.push([
          mainData[i].registrationNumber,
          mainData[i].sem,
          key,
          mainData[i][key],
        ]);
      }
    });

    studentDetails.push([
      mainData[i].registrationNumber,
      mainData[i].studentName,
      mainData[i].sem,
      mainData[i].totalResult,
    ]);
  }
  console.log(studentDetails);
  console.log(studentResults);

  // connect to Db
  //const createDbConnection = require("./db/db.js").creatDbConnection;

  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
    // Your code here
  });

  // excute query

  mysqlConnection.query(
    'INSERT INTO studentDetails values ?',
    [studentDetails],
    (err, results) => {
      if (err) {
        console.log('Invalid query', err);
      } else {
        console.log(results);
      }
    }
  );
  mysqlConnection.query(
    'INSERT INTO mainData values ? ',
    [studentResults],
    (err, results) => {
      if (err) {
        console.log('Invalid query', err);
      } else {
        console.log(results);
      }
    }
  );
  //End Connection
  mysqlConnection.end();
});

app.post('/upload', upload.single('myfile1'), (req, res) => {
  console.log('file uploaded', req.file);
  const latestUploadedFile = getlatestUploadedFile('uploads/');

  if (latestUploadedFile) {
    const mdbFile = latestUploadedFile;

    console.log(mdbFile);

    // const nonNullMdbFileData = mdbFileData.filter(byte => byte !== 0x00);
    // fs.writeFileSync(mdbFile.name, nonNullMdbFileData);
    // console.log(nonNullMdbFileData);

    const csvFilePath = __dirname + '/uploads/csv_data/data.csv';
    const tableName = 'Amber';

    console.log(tableName);
    const MdbFilePath = path.join('uploads', mdbFile);

    // Convert MDB to CSV
    const mdbToCsvCommand = `mdb-export "${MdbFilePath}" ${tableName} > ${csvFilePath}`;
    console.log('Executing command:', mdbToCsvCommand);
    exec(mdbToCsvCommand, async (error, stdout, stderr) => {
      try {
        if (error) {
          console.error(`Error extracting data: ${error.message}`);
          console.log('s2:', stderr);
          res.status(500).send('Error extracting data');
          return;
        }
        console.log('s1:', stdout);
        console.log('Data extracted successfully');
        // Convert CSV to Excel
      } catch {
        console.log('no file found!');
      }
    });
  }
  let data = [];
  console.log(data);
  const dataPath = __dirname + '/uploads/csv_data/data.csv';

  function onDataProcessingComplete() {
    // console.log('From json:', results);
    console.log('data', typeof data);
    console.log(data);
    const dataLength = data.length;
    const mainData = [];
    // const updatedObj = {};
    for (let i = 1; i < dataLength; i++) {
      const object = data[i];
      const updatedObj = {};
      // console.log('obj:', object);
      Object.keys(object).forEach(key => {
        // console.log(key);
        // const updatedObj = {};
        const updatedKey = lodash.camelCase(key);
        updatedObj[updatedKey] = object[key];
      });
      mainData.push(updatedObj);
    }

    // mainData.push(updatedObj);

    console.log('updatedData:', mainData);

    var studentResults = [];
    var studentDetails = [];

    for (let i = 0; i < mainData.length; i++) {
      Object.keys(mainData[i]).forEach(key => {
        if (key.slice(0, 2) == 'cs') {
          studentResults.push([
            mainData[i].registrationNumber,
            mainData[i].sem,
            key,
            mainData[i][key],
          ]);
        }
      });

      studentDetails.push([
        mainData[i].registrationNumber,
        mainData[i].studentName,
        mainData[i].sem,
        mainData[i].totalResult,
      ]);
    }
    console.log(studentDetails);
    console.log(studentResults);

    // connect to Db
    //const createDbConnection = require("./db/db.js").creatDbConnection;

    const mysqlConnection = createDbConnection();

    mysqlConnection.connect(err => {
      if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
      }
      console.log('Connected to MySQL');
    });

    // excute query

    mysqlConnection.query(
      'INSERT INTO studentDetails values ?',
      [studentDetails],
      (err, results) => {
        if (err) {
          console.log('Invalid query', err);
        } else {
          console.log(results);
        }
      }
    );
    mysqlConnection.query(
      'INSERT INTO studentMarksDetails values ?',
      [studentResults],
      (err, results) => {
        if (err) {
          console.log('Invalid query', err);
        } else {
          console.log(results);
          res.send('uploaded successfully');
        }
      }
    );
    //End Connection
    mysqlConnection.end();
  }

  const columnMap = {
    A: 'STUDENT NAME',
    B: 'REGISTRATION NUMBER',
    C: 'COURSE',
    D: 'SEM',
    E: 'CS1_FORMAL LANGUAGES AND AUTOMETA THEORY',
    F: 'CS2_COMPUTER NETWORKS',
    G: 'CS3_WEB TECHNOLOGY',
    H: 'CS4_DESIGN AND ANALYSIS OF ALGORITHMS',
    I: 'CS5_MACHINE LEARNING',
    J: 'CS6_COMPUTER GRAPHICS',
    K: 'CS7_WEB TECHNOLOGY LAB',
    L: 'CS8_COMPUTER GRAPHICS LAB',
    M: 'TOTAL RESULT',
  };

  fs.createReadStream(dataPath)
    .pipe(csv_parser())
    .on('data', row => {
      console.log('rows:', row);
      const newRow = {};

      for (const field in row) {
        // console.log('rows:', row);
        if (Object.hasOwnProperty.call(row, field) && columnMap[field]) {
          console.log(`${columnMap[field]}:${row[field]}`);
          // Convert numeric values to integers
          if (!isNaN(row[field])) {
            newRow[columnMap[field]] = parseFloat(row[field]);
            //   console.log(row[field]);
            //   console.log(newRow[columnMap[field]]);
          } else {
            newRow[columnMap[field]] = row[field];
          }
        }
      }

      data.push(newRow);
      // console.log("NEW ROW:", newRow);
    })
    .on('end', () => {
      // fs.writeFileSync(
      //   './uploads/mdb_data_in_json/data.json',
      //   JSON.stringify(data, null, 2)
      // );
      onDataProcessingComplete();
    });
});

// const filePath = __dirname + '/uploads/mdb_data_in_json/data.json';

// fs.readFile(filePath, 'utf-8', (err, results) => {
//   if (err) {
//     console.log(err);
//   }
//   try {
//     // const data = JSON.parse(results);
//     const mainData = [];
//     // console.log('From json:', results);
//     const data = results;
//     console.log('data', typeof data);
//     const updatedObj = {};
//     for (let i = 1; i < results.length; i++) {
//     const object = data[1];
//     console.log('obj:', object);
//     Object.keys(object).forEach(key => {
//       console.log(key);
//       // const updatedObj = {};
//       const updatedKey = lodash.camelCase(key);
//       updatedObj[updatedKey] = object[key];
//     });
//    }
//     mainData.push(updatedObj);

//     console.log('updatedData:', mainData);
//   } catch (err) {
//     console.log(err);
//   }

//   //Db Connection
//   const mysqlConnection = createDbConnection();

//   //handling connection error
//   mysqlConnection.connect(err => {
//     if (err) {
//       console.error('Error connecting to MySQL:', err);
//       return;
//     }
//     console.log('Connected to MySQL');
//   });

//   // Query Execution
//   mysqlConnection.query(
//     'INSERT INTO studentDetails VALUES (?,?,?,?)',
//     [],
//     (err, results) => {}
//   );
// });

// Student account verification
let secret;
let otp;
app.post('/studentacctVerify', (req, res) => {
  const { studentId, emailid } = req.body;
  // const password = req.body.createPasswd;
  console.log(studentId);
  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });
  // excute query

  mysqlConnection.query(
    'SELECT * FROM studentLoginInfo WHERE user_id=?',
    [studentId],
    async (err, results) => {
      console.log(results);
      if (err) {
        console.log(err);
      }

      console.log(results[0].user_id);

      if (results[0].user_id === +studentId) {
        mysqlConnection.query(
          'UPDATE studentLoginInfo SET user_email=? WHERE user_id=? ',
          [emailid, studentId]
        );

        //otp generation;

        secret = speakeasy.generateSecret();
        otp = speakeasy.totp({
          secret: secret.base32,
          encoding: 'base32',
        });

        console.log('secret token shared between client and server', secret);
        console.log('one time password', otp);
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'ramanakunam16@gmail.com',
            pass: 'bgdjppxbdfvtlcub',
          },
        });

        const mailOptions = {
          from: 'ramanakunam16@gmail.com',
          to: emailid,
          subject: 'your one time password(OTP)',
          text: `Your OTP is :${otp}`,
        };
        console.log(emailid);

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.error('error sennding mail', err);
          } else {
            console.log('email sent', info.response);
          }
        });

        // res.render('otpVerification');

        console.log('successfull');
        // res.redirect('/generateOTP');
      } else {
        res.json({
          isvalid: false,
        });
      }
    }
  );
});

app.post('/facultyacctVerify', (req, res) => {
  const facultyId = req.body.facultyId;
  // const email = req.body.emailid;
  console.log(facultyId);
  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });
  // excute query

  mysqlConnection.query(
    'SELECT * FROM facultyLoginInfo WHERE user_id=?',
    [facultyId],
    async (err, results) => {
      console.log(results);
      if (err) {
        console.log(err);
      }

      console.log(results[0].user_id);

      if (results[0].user_id === +facultyId) {
        console.log('successfull');
        // res.redirect('/generateOTP');
      } else {
        res.json({
          isvalid: false,
        });
      }
    }
  );
});

app.post('/generateOTP', async (req, res) => {
  const email = req.body.emailid;

  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  mysqlConnection.query(
    'SELECT * FROM facultyLoginInfo WHERE user_email=? ',
    [email],
    async (err, results) => {
      if (err) {
      } else {
        const userData = results[0];
        if (email === userData.user_email) {
          secret = speakeasy.generateSecret();
          otp = speakeasy.totp({
            secret: secret.base32,
            encoding: 'base32',
          });

          console.log('secret token shared between client and server', secret);
          console.log('one time password', otp);
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'ramanakunam16@gmail.com',
              pass: 'bgdjppxbdfvtlcub',
            },
          });

          const mailOptions = {
            from: 'ramanakunam16@gmail.com',
            to: email,
            subject: 'your one time password(OTP)',
            text: `Your OTP is :${otp}`,
          };
          console.log(email);

          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              console.error('error sennding mail', err);
            } else {
              console.log('email sent', info.response);
            }
          });

          // res.render('otpVerification');
        }
      }
    }
  );
});
app.post('/otp', (req, res) => {
  const userEnteredOTP = req.body.verifyotp;

  const isValidOTP = speakeasy.totp.verify({
    secret: secret.base32,
    encoding: 'base32',
    token: userEnteredOTP,
    window: 1,
  });

  if (isValidOTP) {
    res.render('createPassword');
  } else {
    res.send('invalid otp');
  }
});
app.post('/studentotp', (req, res) => {
  const userEnteredOTP = req.body.verifyotp;

  const isValidOTP = speakeasy.totp.verify({
    secret: secret.base32,
    encoding: 'base32',
    token: userEnteredOTP,
    window: 1,
  });

  if (isValidOTP) {
    res.render('studentCreatePassword');
  } else {
    res.send('invalid otp');
  }
});
app.post('/passwordCreation', (req, res) => {
  const facultyId = req.body.facultyId;
  const studentId = req.body.studentId;
  const password = req.body.createPasswd;
  console.log(facultyId);
  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });
  // excute query
  if (facultyId) {
    mysqlConnection.query(
      'SELECT * FROM facultyLoginInfo WHERE user_id=?',
      [facultyId],
      async (err, results) => {
        console.log(results);
        if (err) {
          console.log(err);
        }

        console.log(results[0].user_id);

        if (results[0].user_id === +facultyId) {
          const hashedPassword = await bcrypt.hash(password, 10);

          mysqlConnection.query(
            'UPDATE facultyLoginInfo SET hashedPassword=? WHERE user_id=?',
            [hashedPassword, facultyId],
            (err, results) => {
              if (err) {
                console.log(err);
              } else {
                console.log('password  updated');
                res.redirect('login');
              }
            }
          );
          mysqlConnection.end();
        } else {
          console.log('noooo');
        }
      }
    );
  } else {
    mysqlConnection.query(
      'SELECT * FROM studentLoginInfo WHERE user_id=?',
      [studentId],
      async (err, results) => {
        console.log(results);
        if (err) {
          console.log(err);
        }

        console.log(results[0].user_id);

        if (results[0].user_id === +studentId) {
          const hashedPassword = await bcrypt.hash(password, 10);

          mysqlConnection.query(
            'UPDATE studentLoginInfo SET hashedPassword=? WHERE user_id=?',
            [hashedPassword, studentId],
            (err, results) => {
              if (err) {
                console.log(err);
              } else {
                console.log('password  updated');
                res.redirect('login');
              }
            }
          );
          mysqlConnection.end();
        } else {
          console.log('noooo');
        }
      }
    );
  }
});

// login authentication
app.post('/signIn', async (req, res) => {
  const studentId = req.body.studentid;
  const password = req.body.passwd;
  console.log(+studentId);

  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });
  // excute query

  try {
    mysqlConnection.query(
      'SELECT * FROM studentLoginInfo WHERE  user_id=?',
      [+studentId],
      async (err, results) => {
        console.log(results);
        if (err) {
          console.log('Invalid query', err);
        }

        if (results.length === 0) {
          res.json({ isinvalid: true });
        } else if (results.length !== 0) {
          const passwordMatch = await bcrypt.compare(
            password,
            results[0].hashedPassword
          );
          let profilePic;
          if (+studentId === results[0].user_id && passwordMatch) {
            console.log('logged');
            // results1 = results[0];
            // const token = jwt.sign(
            //   { studentId },
            //   "secretKey",
            //   (expiresIn = '1h')
            // );
            // // console.log(token);
            // res.cookie('jwt',token,{httpOnly:true,maxAge:3600000})

            req.session.results = { type: 'student', user: results[0] };
            const userData = req.session.results;
            console.log('results', userData);
            res.json({ isLogged: true });
            // res.json({ isLogged: true });
          } else {
            res.json({ isLogged: false });
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
});
app.get('/getSessionData', (req, res) => {
  const userData = req.session.results || null;
  res.json({ userData });
});

app.post('/facultysignIn', (req, res) => {
  const facultyId = req.body.adminid;
  const password = req.body.passwd;
  console.log(+facultyId);
  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  mysqlConnection.query(
    'SELECT * FROM facultyLoginInfo WHERE  user_id=?',
    [+facultyId],
    async (err, results) => {
      console.log(results);
      if (err) {
        console.log('Invalid query', err);
      }

      if (results.length === 0) {
        // res.render("check");
        return;
      } else if (results.length !== 0) {
        const passwordMatch = await bcrypt.compare(
          password,
          results[0].hashedPassword
        );

        if (+facultyId === results[0].user_id && passwordMatch) {
          // results1 = results[0];
          req.session.results = { type: 'faculty', user: results[0] };
          const userData = req.session.results;
          console.log('results', userData);
          // res.render('facultyDashBoard', {
          //   username: userData.user.user_name,
          // });
          res.json({ isLogged: true, isVerifyed: true });
        } else {
          res.json({ isLogged: false });
        }
      }
    }
  );
});
app.get('/facultyDashBoard', isAuthUser, (req, res) => {
  const userData = req.session.results;
  console.log('results', userData);
  res.render('facultyDashBoard', {
    username: userData.user.user_name,
  });
});
function isAuthUser(req, res, next) {
  if (req.session && req.session.results) {
    return next();
  }

  res.redirect('/');
}

// dashboard page
app.get('/dashBoard', isAuthUser, (req, res) => {
  const { user } = req.session.results;
  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });
  mysqlConnection.query(
    'SELECT * FROM studentProfilePics WHERE user_id=?',
    [user.user_id],
    (err, results) => {
      console.log(results);
      const profilePic = results[0];
      // console.log(profilePic.data);
      if (profilePic === null) {
        res.render('dashBoard', {
          username: user.user_name,
          email: user.user_email,
          profilePicData: 'no profile pic',
          profilePicMimeType: 'no profile pic',
        });
      } else {
        res.render('dashBoard', {
          username: user.user_name,
          email: user.user_email,
          profilePicData: profilePic?.data,
          profilePicMimeType: profilePic?.mime_type,
        });
      }
    }
  );
});

//booksReservation

app.post('/bookReservation', isAuthUser, (req, res) => {
  const { book, bookedDate } = req.body;
  console.log(book, bookedDate);
  const userData = req.session.results;
  console.log(userData);

  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  mysqlConnection.query(
    'INSERT INTO reservedBooks (studentId,book_title,author,publishers,book_edition,book_img,book_id,booked_date) VALUES(?,?,?,?,?,?,?,?)',
    [
      userData.user.user_id,
      book.book_title,
      book.author,
      book.publishers,
      book.book_edition,
      book.book_img,
      book.book_id,
      bookedDate,
    ]
  );

  mysqlConnection.end();
});
app.post('/rejectedBooks', (req, res) => {
  const { studentId, book_title, author, publishers, book_edition, book_id } =
    req.body.book;
  const rejectedDate = req.body.rejectedDate;
  const reason = req.body.reason;
  // console.log(reason);

  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  mysqlConnection.query(
    'INSERT INTO rejectedBooks (studentId,book_title,author,publishers,book_edition,reason,book_id,rejected_date) VALUES(?,?,?,?,?,?,?,?)',
    [
      studentId,
      book_title,
      author,
      publishers,
      book_edition,
      reason,
      book_id,
      rejectedDate,
    ]
  );
  res.json({
    deleted: true,
  });

  mysqlConnection.query(
    'DELETE FROM reservedBooks WHERE studentId=? AND book_id=? ',
    [studentId, book_id]
  );
  mysqlConnection.end();
});
app.post('/completedBooks', (req, res) => {
  const { studentId, book_title, author, publishers, book_edition, book_id } =
    req.body.book;
  const completedDate = req.body.completedDate;

  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  mysqlConnection.query(
    'INSERT INTO completedBooks (studentId,book_title,author,publishers,book_edition,book_id,completed_date) VALUES(?,?,?,?,?,?,?)',
    [
      studentId,
      book_title,
      author,
      publishers,
      book_edition,
      book_id,
      completedDate,
    ]
  );
  res.json({
    deleted: true,
  });

  mysqlConnection.query(
    'DELETE FROM reservedBooks WHERE studentId=? AND book_id=? ',
    [studentId, book_id]
  );
  mysqlConnection.end();
});
app.post('/returnedBooks', (req, res) => {
  const { studentId, book_title, author, publishers, book_edition, book_id } =
    req.body.book;
  const returnedDate = new Date();
  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  try {
    mysqlConnection.query(
      'INSERT INTO returnedBooks (studentId,book_title,author,publishers,book_edition,returned_date,book_id) VALUES(?,?,?,?,?,?,?);',
      [
        studentId,
        book_title,
        author,
        publishers,
        book_edition,
        returnedDate,
        book_id,
      ]
    );
    mysqlConnection.query(
      'UPDATE completedBooks SET returned= 1 - returned WHERE book_id=?;',
      [book_id]
    );
    // mysqlConnection.end();
    res.json({
      returned: true,
    });
  } catch (error) {
    console.log(error);
  }

  // mysqlConnection.query(
  //   'DELETE FROM reservedBooks WHERE studentId=? AND book_id=? ',
  //   [studentId, book_id]
  // );
  mysqlConnection.end();
});
app.get('/reservedBooks', (req, res) => {
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  mysqlConnection.query('SELECT * FROM reservedBooks', (err, results) => {
    // console.log(results);

    res.json(results);
  });
});
app.get('/returnedBooks', (req, res) => {
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  mysqlConnection.query('SELECT * FROM returnedBooks', (err, results) => {
    // console.log(results);

    res.json(results);
  });
});
app.get('/rejectedBooks', (_, res) => {
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  mysqlConnection.query('SELECT * FROM rejectedBooks', (err, results) => {
    // console.log(results);

    res.json(results);
  });
});

app.get('/completedBooks', (_, res) => {
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  mysqlConnection.query('SELECT * FROM completedBooks', (err, results) => {
    // console.log(results);

    res.json(results);
  });
});

// settings pages
app.get('/settings', isAuthUser, (req, res) => {
  // req.session.results1 = results1;
  // const filePath = __dirname + '/public/settings.ejs';

  const { user } = req.session.results;

  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });
  mysqlConnection.query(
    'SELECT * FROM studentProfilePics WHERE user_id=?',
    [user.user_id],
    (err, results) => {
      console.log(results);
      let profilePic = results[0];
      // if (profilePic === null) {
      //   res.render('settings', {
      //     username: user.user_name,
      //     email: user.user_email,
      //     profilePicData: 'profile pic',
      //     profilePicMimeType: 'profile pic',
      //   });
      // } else {
      res.render('settings', {
        username: user.user_name,
        email: user.user_email,
        profilePicData: profilePic?.data,
        profilePicMimeType: profilePic?.mime_type,
      });
    }
    // }
  );
});

app.post('/uploadProfilePic', (req, res) => {
  const { data, name, mimetype } = req.files.pic;
  const { user } = req.session.results;
  // console.log(userData);
  console.log(data);
  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });
  mysqlConnection.query(
    'INSERT INTO studentProfilePics (user_id,file_name,mime_type,data) VALUES(?,?,?,?)',
    [user.user_id, name, mimetype, data]
  );

  res.json('uploaded');
});

// logout
app.get('/logout', (req, res) => {
  req.session.destroy();

  res.clearCookie('connect.sid');
  res.redirect('/');
});
app.get('/facultylogout', (req, res) => {
  req.session.destroy();

  res.clearCookie('connect.sid');
  res.redirect('/');
});
app.post('/check-Validity', (req, res) => {
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  const emailOrUserName = req.body.usernameOrEmail;
  console.log(emailOrUserName);

  mysqlConnection.query(
    'SELECT * FROM users WHERE user_name=? OR user_email=?',
    [emailOrUserName, emailOrUserName],
    (err, results) => {
      console.log(results);
      if (err) {
        res.send('invalid ');
      }

      const validity = results.length === 0;

      res.json({ isValidity: validity });
    }
  );
});

// app.post('/dashBoard', (req, res) => {});

// update profile info
app.post('/updateInfo', isAuthUser, (req, res) => {
  const username = req.body.uname;
  const email = req.body.email;
  console.log('name', username);
  console.log('email', email);

  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  const userData = req.session.results;

  mysqlConnection.query(
    'UPDATE studentLoginInfo SET user_name=CASE WHEN ? IS NOT NULL THEN ? ELSE user_name END,user_email = CASE WHEN ? IS NOT NULL THEN ? ELSE user_email END WHERE user_name=?',
    [username, username, email, email, userData.user.user_name],
    (err, results) => {
      console.log(results);
      if (err) {
        console.log('Internal error occurs', err);
      }
      // const updatedUserData = results[0];
      // const UpdatedUserData = ;
      // console.log('user', userData);
      userData.user_name = username;
      userData.user_email = email;
      if (profilePic === 0) {
        res.render('settings', {
          username: userData.user.user_name,
          email: userData.user.user_email,
          profilePicData: 'no profile pic',
          profilePicMimeType: 'no profile pic',
        });
      } else {
        res.render('settings', {
          username: userData.user.user_name,
          email: userData.user.user_email,
          profilePicData: profilePic.data,
          profilePicMimeType: profilePic.mime_type,
        });
      }
    }
  );
  mysqlConnection.end();
  // res.send('updated success.');
});

// change password
app.post('/changePasswd', isAuthUser, async (req, res) => {
  const oldPassword = req.body.opasswd;
  const newPassword = req.body.npasswd;
  const userData = req.session.results;

  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;
    }
    console.log('Connected to MySQL');
  });

  const newHashedPassword = await bcrypt.hash(newPassword, 10);

  const passwordMatch = await bcrypt.compare(
    oldPassword,
    userData.hashedPassword
  );

  if (passwordMatch) {
    mysqlConnection.query(
      'UPDATE studentLoginInfo SET hashedPassword=?',
      [newHashedPassword],
      (err, results) => {
        if (err) {
          console.log(err);
        }
        if (profilePic === 0) {
          res.render('settings', {
            username: userData.user.user_name,
            email: userData.user.user_email,
            profilePicData: 'no profile pic',
            profilePicMimeType: 'no profile pic',
          });
        } else {
          res.render('settings', {
            username: userData.user.user_name,
            email: userData.user.user_email,
            profilePicData: profilePic.data,
            profilePicMimeType: profilePic.mime_type,
          });
        }
      }
    );
  } else {
    res.send('wrong old password.Retry again!');
  }
});

app.post('/resetPassword', async (req, res) => {
  const email = req.body.email;
  const newPassword = req.body.npasswd;
  const newHashedPassword = await bcrypt.hash(newPassword, 10);
  //db connection
  const mysqlConnection = createDbConnection();

  mysqlConnection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return;

      console.log('Connected to MySQL');
    }
  });
});

app.post('/saved-list', isAuthUser, async (req, res) => {
  try {
    const { user } = req.session.results;
    const blog = req.body.blog;
    console.log(blog);
    const blogData = await Post.findById({ _id: blog });
    console.log(blogData.savedBy);

    // const savedBy= await Post.find()

    // console.log(saved);
    await Post.updateMany(
      { _id: blog },
      { $set: { savedBy: [...blogData.savedBy, user.user_id] } }
    );

    await SavedPost.insertMany([
      {
        title: blogData.title,
        body: blogData.body,
        createdAt: blogData.createdAt,
        createdBy: blogData.createdBy,
        savedBy: user.user_id,
      },
    ]);
    res.redirect('/blogs');
  } catch (error) {
    console.log(error);
  }
});

app.get('/saved-list', isAuthUser, async (req, res) => {
  // const data = await SavedPost.find();
  const { user } = req.session.results;
  const data = await Post.find();
  res.json({ data, userid: user.user_id });
});

app.post('/removestory', async (req, res) => {
  try {
    const { user } = req.session.results;
    console.log(req.body);
    await Post.updateMany(
      { _id: req.body.blogId },
      { $pull: { savedBy: user.user_id } }
    );
    res.redirect('/reading-list');
  } catch (error) {
    console.log(error);
  }
});

app.post('/write-post', isAuthUser, async (req, res) => {
  const data = req.body;
  // console.log(data);
  const { user } = req.session.results;
  // console.log(userData.user.user_name);

  await Post.insertMany([
    {
      title: data.title,
      body: data.story,
      createdBy: `${user.user_name}`,
    },
  ]);
  res.redirect('/blogs');
});

// app.post('/create-checkout', isAuthUser, (req, res) => {
//   try {
//     const session = stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       mode: 'payment',
//       line_items: req.body.productData.map(item => {
//         return {
//           price_data: {
//             currency: 'inr',
//             product_data: {
//               name: item.item,
//             },
//             unit_amount: item.price,
//           },
//           quantity: item.quantity,
//         };
//       }),
//       success_url: `http://localhost:8007/sucess.ejs`,
//       cancel_url: `http://localhost:8007/cancel.ejs`,
//     });
//     // console.log(session.url);
//     res.json({ url: session });
//   } catch (error) {
//     console.log(error);
//   }
// });

// const storeItems = new Map([
//   [1, { priceInCents: 10000, name: 'Learn React Today' }],
//   [2, { priceInCents: 20000, name: 'Learn CSS Today' }],
// ]);

app.post('/create-checkout', isAuthUser, async (req, res) => {
  let price = 105000;
  console.log(req.body);
  try {
    console.log(req.body);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'INR',
            product_data: {
              name: `${req.body.semester} Registration`,
              description: `${req.body.semester} Registration`,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        description: `${req.body.semester} Registration`,
        user_id: req.body.studentId,
      },
      billing_address_collection: 'required',
      success_url: `${process.env.SERVER_URL}/success.html`,
      cancel_url: `${process.env.SERVER_URL}/cancel.html`,
    });
    res.json({ url: session.url, id: session.id });
  } catch (e) {
    console.log(e);
  }
});
// const WEBHOOK_SECRET =
//   'whsec_bad87d758c13d11b3e25f7705e09279d3090e1782fafe4b740e67a972e751ae4';
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    // try {
    //   event = stripe.webhooks.constructEvent(
    //     req.body,
    //     sig,
    //     WEBHOOK_SECRET
    //   );
    //   console.log('webhook verifyed', event.type);
    // } catch (err) {
    //   console.log(`Webhook Error: ${err.message}`);
    //   response.status(400).send(`Webhook Error: ${err.message}`);
    //   return;
    // }

    if (req.body.type === 'checkout.session.completed') {
      const data = req.body.data.object;
      console.log(data);
      await RegistrationPayments.insertMany([
        {
          student_id: data.metadata.user_id,
          payment_intent: data.payment_intent,
          description: data.metadata.description,
          amount: data.amount_total,
          payment_status: data.payment_status,
        },
      ]);
    }

    // Handle the event
    // switch (event.type) {
    //   case 'invoice.payment_succeeded':
    //     const invoicePaymentSucceeded = event.data.object;
    //     // Then define and call a function to handle the event invoice.payment_succeeded
    //     break;
    //   // ... handle other event types
    //   default:
    //     console.log(`Unhandled event type ${event.type}`);
    // }

    // Return a 200 response to acknowledge receipt of the event
    res.send();
  }
);
app.listen(port, '0.0.0.0', () => {
  console.log(`app listening on port ${port}`);
});
