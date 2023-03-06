import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js'; // 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js' firebase/app;
const firebaseConfig = {
  apiKey: "AIzaSyCxAomFX0E2EZl3aRsNuLY2BhebY2x3Rk0",
  authDomain: "sandbox-sean.firebaseapp.com",
  databaseURL: "https://sandbox-sean-default-rtdb.firebaseio.com",
  projectId: "sandbox-sean",
  storageBucket: "sandbox-sean.appspot.com",
  messagingSenderId: "873201858434",
  appId: "1:873201858434:web:deaa507a11823e4c41419b",
  measurementId: "G-TCLJKJZB8F"
};
const app = initializeApp(firebaseConfig);

// Add the Firebase products and methods that you want to use
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  EmailAuthProvider,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js'; // 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js' 'firebase-auth';

import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
  where,
  documentId
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js' // https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js 'firebase/firestore';

import {
  getStorage,
  getDownloadURL,
  ref,
  uploadString,
  uploadBytesResumable
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js';

const auth = getAuth(app);
const db = getFirestore(app);

// Document elements
const wrapperSignin = document.getElementById('wrapper-signin');
const sectionReports = document.getElementById('sectionReports');
const detailsTemplate = document.getElementById('detailsTemplate');
const signinBtn = document.getElementById('signin');
const signoutBtn = document.getElementById('signout');

// use these later to determine what level of access a viewer has
const signinUsr = document.getElementById('creds_id');
const signinPwd = document.getElementById('creds_pwd');

var currentUser = null;
var autoSignOutComplete = false;
let reportsListener = null;

async function main() {

  $(document).ready(function() {
    // one-time items once after doc is ready
    // don't refresh the page when the login button is clicked
    $("#signinForm").submit(function(e) {
      e.preventDefault();
    });
    signinBtn.addEventListener("click", signinClicked);
    signoutBtn.addEventListener("click", signoutClicked);
    // signoutFirebase();
    autoSignOutComplete = true;

  });

  // fires on auth state change AND initial start (could be before document ready)
  // this can be confusing ... say prior to document ready a user shows as 'signed in'
  // the AuthStateChanged fires before signoutFirebase() has run ( want user to sign in always )
  onAuthStateChanged(auth, user => {
    var signedIn = user != null && user.uid != null;
    wrapperSignin.style.display = signedIn ? 'none' : 'block';
    sectionReports.style.display = signedIn ? 'block' : 'none';

    if(currentUser == user) {
      // no change -> either signed in or not ... do nothing

    }
    else {
      // changed, update currentUser and do something
      // only log to the console a change if it was done manually
      if(autoSignOutComplete) {
        if (signedIn) {
          console.log(`user ${user.uid} successfully signed in at ${new Date()}`);
          // userConfigs(); // <-- add new users

          initialReportsLoad();
          ///////// start realtime updates
          // subscribeReportIteration();
    
        } else {
          console.log(`user ${currentUser.uid} successfully signed out at ${new Date()}`);
          wrapperSignin.style.display = 'block';
          unsubscribeReportIteration();

        }
      }
      currentUser = user;
    }
  });
  async function signinClicked() {
    
    resetSectionReports();
    const signin = await signInWithEmailAndPassword(auth, signinUsr.value, signinPwd.value)
    .then((userCredential) => {
      // ....... do something

    }).catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(`${errorCode}: ${errorMessage}`);
      // ....... do something
      
    });

  }
  async function signoutClicked() {

    resetSectionReports()
    await signOut(auth).then(() => {
      signinBtn.innerHTML = 'Let me in!';
      autoSignOutComplete = true;

    }).catch(error => {
      console.log(`${error.code}: ${error.message}`);
    });

  }
  function resetSectionReports() {

    $(document).ready(function() {

      var detailsReports = document.getElementsByTagName('details');
      for (var i = 0, item; item = detailsReports[i]; i++) {
        if(item.style.display == 'block') {
          document.getElementById('sectionReports').removeChild(item);
        }
      }
      
    });

  }
  async function initialReportsLoad() {

    resetSectionReports();
    let accessByUser = [];
    const access = query(collection(db, 'access'));
    const accessSnapshot = await getDocs(access);
    accessSnapshot.forEach((doc) => {
      var docData = doc.data();
      var users = docData.Users;
      for (var u = 0; u < users.length; u++) {
        var user = users[u];
        accessByUser[user.Id] = user.Access;
      }
    });

    // addReport('Ll62xGQgTNfODmdwWBse', lecap);
    // addReport('7AJmtUU3ypXSlNhqYVch', panama);
    // addReport('P9uiMYRAPjXZziB4f9hq', beaubien);
    // addReport('H1nWYmk8CgzRtxp1vt6p', granby);

    var signedInUser_hasProfile = auth.currentUser.uid in accessByUser;
    if(signedInUser_hasProfile) {
      var userAccess = accessByUser[auth.currentUser.uid];
      var accessToAll = userAccess.ReportIds.length == 0;
      var accessLvl = userAccess.Permission;
      if(accessLvl >= 1) {
        // 0 = none, 1 = read, 2 = write
        // now get a list of reports to which the user has access
        // either user has access to a partial list or a full list - none doesn't get here
        var reports = collection(db, 'reports');
        var q;
        if(accessToAll) {
          q = query(reports, orderBy('Document.Date', 'desc'));
        }
        else {
          q = query(reports, where(documentId(), 'in', userAccess.ReportIds));
        }
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          if(accessToAll | userAccess.ReportIds.includes(doc.id)) {
            // console.log(doc.id, " => ", doc.data());
            updateReportHTML(doc, false);
          }
        });
        // window.scrollTo(0, document.body.scrollHeight);
      }
    }
  }
  async function subscribeReportIteration() {

    resetSectionReports();
    const q = query(collection(db, 'reports'), orderBy('Document.Date', 'desc'));
    reportsListener = await onSnapshot(q, snaps => {
      snaps.forEach(doc => {
        // updateReportHTML(doc, false);
      });
      initialReportsLoad();
    });

  }
  async function unsubscribeReportIteration() {
    ///////// stop realtime updates
    if (reportsListener != null) {
      reportsListener();
      reportsListener = null;
    }
  }
  async function updateReportHTML(queryDoc, openReport) {

    if(document.getElementById(queryDoc.id) != null) return;

    var clone = detailsTemplate.cloneNode(true);
    var docData = queryDoc.data();
    var notes = docData.Notes;
    var job = docData.Job;
    var products = docData.Products;
    var contactInfo = docData.ContactInfo;
    var contactAddress = contactInfo.Address;
    var businessName = contactInfo.Organisation;
    var summaryClone = clone.getElementsByTagName('summary')[0];

    businessName = businessName.replace(/\s{2,}/g, ' ').trim();
    summaryClone.innerHTML = businessName;
    clone.id = queryDoc.id;

    ////////// potentially change all the element names so jquery can find them
    // can't do this for id
    // var elementsWithId = $("*[id]");
    // for(var i = 0; i < elementsWithId.length; i++) {
    //   var elementId = elementsWithId[i].id;
    //   elementsWithId[i].name = queryDoc.id + '_' + elementId;
    // }

    var submitBtn = clone.querySelector("#submitForm");
    submitBtn.style = 'background-color: #55acee; padding: 10px 30px 10px 30px;';
    submitBtn.addEventListener('click', function() {

      var signedBy = clone.querySelector('#clientSignature');
      if(signedBy.value != null && signedBy.value.length > 0) {
        var dict = {};      
        var rows = clone.querySelector("#starsByCategory").querySelectorAll("tr");
        for (var rw = 0; rw < rows.length; rw++) {
          var sumStars = 0;
          var row20 = rows[rw];
          var stars = row20.querySelectorAll("img");
          for (var str = 0; str < stars.length; str++) {
            var star = stars[str];
            var ehf = star.getAttribute('src').split('/')[1].split('.')[0].replace('star', '');
            var starValue = ehf == 'Fill' ? 1 : ehf == 'Half' ? .5 : 0;
            sumStars += starValue;
          }
          var description = null;
          if(row20.querySelector('input') == null) {
            description = row20.querySelector('td').innerHTML;
          }
          else {
            description = row20.querySelector('input').value.trim();
            if(description == '') { description = 'optionalInput'}
          }
          dict[description] = sumStars;
        }

        const feedback = {
          "ClientResponse": {
            "Submitter": clone.querySelector("#clientSignature").value,
            "Date": new Date(),
            "Submited": true,
            "Feedback": {
              "stars": dict,
              "comments": clone.querySelector("#clientComments").value
            }
          }
        };

        // updating the database so turn off so page won't reset
        unsubscribeReportIteration();
        const destDoc = doc(db, 'reports', queryDoc.id);
        setDoc(destDoc, feedback, { merge:true })
        .then(destDoc => {
            console.log(`Document updated successfully`);
            submitBtn.style = 'background-color: #32CD32; padding: 10px 30px 10px 30px;';
        })
        .catch(error => {
            console.log(error);
            submitBtn.style = 'background-color: red; padding: 10px 30px 10px 30px;'
        })

        clone.querySelector('#mainForm').style.display = 'none';
        clone.querySelector('#thankYouMessage').style.display = 'block';

        // updated the database so turn back on so page will reset
        // subscribeReportIteration();
      }

    });

    clone.querySelector('#div_files-chooseJSON').addEventListener('click', function() {
      // click to choose new access config JSON -or- new report JSON
      // addReport('abcdefghij', cranby);
    });

    //#region "file upload"
    // perform a click on the input file to start the file explorer
    // done this way since label for= doesn't register the files a user selected
    var filesChoose_delegate = clone.querySelector('#div_files-choose');
    var filesChoose = clone.querySelector('#files-choose');
    var filesUpload = clone.querySelector('#div_files-upload');
    var label_filesChoose = clone.querySelector('#label_files-choose');
    var label_filesUpload = clone.querySelector('#label_files-upload');
    filesChoose_delegate.addEventListener('click', function (e) {
      // Get the target
      const target = e.target;
      // Get the bounding rectangle of target
      const rect = target.getBoundingClientRect();
      // Mouse position
      const x = e.clientX;
      const y = e.clientY;

      var trash = clone.querySelector('#files-trash');
      if(trash == null) {
        filesChoose.click();
      }
      else {
        var trashRect = trash.getBoundingClientRect();
        if(x > trashRect.x & x < (trashRect.x + trashRect.width) & y > trashRect.y & y < (trashRect.y + trashRect.height)) {
          /// clicked on the trashcan!
          resetSelectUpload();
        }
        else {
          filesChoose.click();
        }
      }
    });
    // the change event is fired when the file explorer returned selected file(s)
    filesChoose.addEventListener('change', async function() {

      var filenames = [];
      for (var f = 0; f < filesChoose.files.length; f++) {
        filenames.push(filesChoose.files[f].name);
      }
      if(filenames.length == 0) {
        resetSelectUpload();
      }
      else {
        label_filesUpload.style = "background-color: green; color: white";
        label_filesChoose.innerHTML = `<i class="bi bi-trash" id="files-trash" style="font-size:24px;"></i>${filenames.join(' + ')}`;
        clone.querySelector('#files-trash').addEventListener('click', function() {
          label_filesUpload.innerHTML = '<i class="bi bi-cloud-arrow-up" style="font-size:24px; z-index: 1"></i>Upload';
        })
      }

    });
    filesUpload.addEventListener('click', async function() {

      ////////// upload compressed photos of a completed room
      label_filesUpload.style = "background-color: gold; color: black";
      for (var f = 0; f < filesChoose.files.length; f++) {
        var file = filesChoose.files[f];
        await uploadFile(file, queryDoc.id);
      }
      label_filesUpload.style = "background-color: green; color: white";

    });
    function resetSelectUpload() {

      filesChoose.value = '';
      label_filesUpload.style = "color: black";
      label_filesChoose.innerHTML = '<i class="bi bi-folder-plus" style="font-size:24px;"></i>Choose file(s)';

    }
    //#endregion

    var docDate = docData.Document.Date;
    clone.querySelector("#businessName").setAttribute("value", businessName);
    clone.querySelector("#purchaseOrder").setAttribute("value", job.OrderNbr);
    clone.querySelector("#documentDate").setAttribute("value", docDate.split('T')[0]);
    clone.querySelector("#addressStreet").setAttribute("value", contactAddress.Street);
    clone.querySelector("#addressCity").setAttribute("value", contactAddress.City);
    clone.querySelector("#addressPostalCode").setAttribute("value", contactAddress.Code);
    
    // 0   1   2   3   4   5   6   7   8   9   10  11  12
    // AB, BC, MB, NB, NL, NT, NS, NU, ON, PE, QC, SK, YK
    optionSet(clone, 'provinces', contactAddress.Province);
    
    clone.querySelector("#contactName").setAttribute("value", contactInfo.Name);
    clone.querySelector("#contactTitle").setAttribute("value", contactInfo.Title);
    clone.querySelector("#contactEmail").setAttribute("value", contactInfo.Email);
    clone.querySelector("#contactPhone").setAttribute("value", contactInfo.Phone);
   
    optionSet(clone, 'jobTypes', job.Type);
    clone.querySelector("#checkComplete").checked = job.Completed;
    clone.querySelector("#startDate").setAttribute("value", job.Start.split('T')[0]);
    clone.querySelector("#endDate").setAttribute("value", job.End.split('T')[0]);

    var clientResponse = docData.ClientResponse;
    var submitWarning = clone.querySelector("#submitWarning");
    if(clientResponse == null) {
      submitWarning.style.display = 'none';
    }
    else {
      submitWarning.style.display = 'block';
      var tmstmp = new Date(clientResponse.Date.seconds * 1000).toString();
      var match = /20[0-9]{2} [0-2][0-9]:[0-5][0-9]:[0-5][0-9]/g.exec(tmstmp);
      var matchString = tmstmp.substr(0, match.index + match[0].length);
      submitWarning.innerText = `Submitted ${matchString} ... submit agian (overwrite)?`;
    }

    summaryClone.style.borderLeft = '15px solid grey';
    clone.style = "display: block";
    sectionReports.appendChild(clone);
    clone.open = openReport; // show (or not) the section - if report.count == 1 --> open, otherwise user clicks to open

    // do this ONLY after visible... otherwise error!
    await delay(1);
    textareaSetText(clone, 'comments', notes.Comments);
    textareaSetText(clone, 'issues', notes.Issues);

    // get the products collection, which contains a list of ALL products in the job
    // ... in the serial section, show only products marked with a serial number
    var serializedProducts = products.filter(function (product) {
      return product.Serials.length > 0;
    });
    const nbrCols = 3;
    var rowNbr = 1;
    var colNbr = 1;
    for (var p = 0; p < serializedProducts.length; p++) {
      var product = serializedProducts[p];
      var rc = `r${rowNbr}c${colNbr}_serial`;
      colNbr++;
      if(colNbr == 4) {
        colNbr = 1; rowNbr++;
      }
      var productSerials = product.Serials.join(',');
      var serialText = '<strong>' + (product.Serials.length == 1 ? 'serial# ' + product.Serials[0] : `serials: [${productSerials}]`) + '</strong>';
      var cellText = `${product.Code} ${product.Description} ${serialText}`.trim();
      rxcySetCellText(clone, rc, cellText);
    };
    // ... in the trained section (products), show only products marked as Trained: true
    var trainedProducts = products.filter(function (product) {
      return product.Trained;
    });
    var rowNbr = 1;
    var colNbr = 1;
    for (var p = 0; p < trainedProducts.length; p++) {
      var product = trainedProducts[p];
      var rc = `r${rowNbr}c${colNbr}_trained`;
      colNbr++;
      if(colNbr == 4) {
        colNbr = 1; rowNbr++;
      }
      var cellText = `${product.Code} ${product.Description}`.trim();
      rxcySetCellText(clone, rc, cellText);
    };
    // ... the trained staff section is populated with a list from the docData.TrainedStaff
    rxcySetCellText(clone, 'r1c1_trainedStaff', docData.TrainedStaff.join(', '));

  }

// misc functions
  function createGUID() {
    return('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
    }));
  }
  function delay(time) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), time);
    });
  }
  function textareaSetText(clonedReport, id, text) {

    var guidId = `${id}_${createGUID()}`;
    clonedReport.querySelector("#" + id).setAttribute("id", guidId);
    // using document.getElementById does NOT work!
    // var textArea = document.getElementById(guidId);
    // textArea.setAttribute('value', text);
    
    // ... but JQuery does!
    var textarea = $('#' + guidId);
    if(textarea != null) {
      try {
        textarea.val(text.replaceAll('■', '\n'));
        textarea.css('height', `${textarea.get(0).scrollHeight}px`);
      }
      catch {}
    }

  }
  function optionSet(clonedReport, id, selectedIndex) {

    var options = clonedReport.querySelector('#' + id).children;
    options.selectedIndex = -1;
    var option = options[selectedIndex + 1];
    clonedReport.querySelector(`#${option.id}`).setAttribute("selected", "\"\"");

  }
  function rxcySetCellText(clonedReport, rxcy, text) {

    var guidId = `${rxcy}_${createGUID()}`;
    var docCell = clonedReport.querySelector("#" + rxcy);
    if(docCell != null) {
      docCell.setAttribute('id', guidId);
      docCell.innerHTML = text;
    }

  }
  function toBase64(file) {

    if(file == null) {
      return 'empty file!';
    }
    else {
      var reader = new FileReader();
      reader.onloadend = function() {
        return reader.result;
      }
      reader.readAsDataURL(file);
    }

  }
  function uploadBase64() {

      // Base64 formatted string
      const message2 = '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';
      uploadString(storageRef, message2, 'base64').then((snapshot) => {
        console.log('Uploaded a base64 string!');
      });
      // Data URL string
      const message4 = 'data:text/plain;base64,5b6p5Y+344GX44G+44GX44Gf77yB44GK44KB44Gn44Go44GG77yB';
      uploadString(storageRef, message4, 'data_url').then((snapshot) => {
        console.log('Uploaded a data_url string!');
      });

  }
  async function uploadFile(file, id) {

    var filename = `sean/files/${id}/${file.name}`;
    const storage = getStorage();
    const storageRef = ref(storage, filename);

    // below reference for contentType:
    // https://stackoverflow.com/questions/23714383/what-are-all-the-possible-values-for-http-content-type-header
    
    /////////////// supported types for this application
    // application/json
    // application/pdf
    // application/zip
    // image/gif * no
    // image/jpeg
    // image/png
    // text/csv
    // text/html
    // text/plain

    var dots = file.name.split('.');
    var extension = dots[dots.length - 1].toLowerCase();
    var applicationTypes = ['json', 'pdf', 'zip'];
    var imageTypes = ['jpeg', 'png'];
    var textTypes = ['csv', 'html', 'txt'];
    var content = applicationTypes.includes(extension) ? 'application' : imageTypes.includes(extension) ? 'image' : textTypes.includes(extension) ? 'text' : '';
    if(content.length == 0) return;
    else {
      content = `${content}/${extension}`;
      const metadata = {
        contentType: content,
      };
      // Upload the file and metadata
      const uploadTask = await uploadBytesResumable(storageRef, file, metadata);
      // Listen for state changes, errors, and completion of the upload.
      uploadTask.task.on('state_changed',
      (snapshot) => {
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
        switch (snapshot.state) {
          case 'paused':
            console.log('Upload is paused');
            break;
          case 'running':
            console.log('Upload is running');
            break;
        }
      }, 
      (error) => {
        // A full list of error codes is available at
        // https://firebase.google.com/docs/storage/web/handle-errors
        switch (error.code) {
          case 'storage/unauthorized':
            // User doesn't have permission to access the object
            break;
          case 'storage/canceled':
            // User canceled the upload
            break;
          case 'storage/unknown':
            // Unknown error occurred, inspect error.serverResponse
            break;
        }
      }, 
      () => {
        // Upload completed successfully, now we can get the download URL
        getDownloadURL(uploadTask.task.snapshot.ref).then((downloadURL) => {
          console.log('File available at', downloadURL);
        });
      }
      );
    }

  }

  // misc firestore
  async function copyFirestore() {

    /////////////// from query -> doc ??
    const destDoc = doc(db, 'reports', 'Ll62xGQgTNfODmdwWBse'); // new
    const q = query(collection(db, 'reports'), where('ContactInfo.Organisation', "==", 'Centre Le Cap'));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((srcDoc) => {
      console.log(srcDoc.id, ' => ', srcDoc.data());
      setDoc(destDoc, srcDoc.data(), { merge:true })
      .then(destDoc => {
          console.log(`Document copied successfully`);
      })
      .catch(error => {
          console.log(error);
      })
    });

  }
  async function userConfigs() {

    const destDoc = doc(db, 'access', 'b9NbHHku509AEMHjF6Kw'); // update
    var currentAccesses = {
      "Users": [
        {
          "Id": "A4fQrSN1OaNsTBP966dRGPM31ZX2",
          "Access": {
            "Permission": 2,
            "ReportIds": []
          }
        },
        {
          "Id": "GjicU8Ixl7b3GGV9Tn1nEyyKtD03",
          "Access": {
            "Permission": 1,
            "ReportIds": []
          }
        },
        {
          "Id": "b9qSXlPWDhYnoXRKGq1qv34arEM2",
          "Access": {
            "Permission": 1,
            "ReportIds": []
          }
        },
        {
          "Id": "6r1rEItvtog8uA04TVQmieQ3CnC2",
          "Access": {
            "Permission": 1,
            "ReportIds": [
              "7AJmtUU3ypXSlNhqYVch"
            ]
          }
        },
        {
          "Id": "7DsUGuz3rOhDkxStsZ8pbeu1mvB3",
          "Access": {
            "Permission": 1,
            "ReportIds": [
              "Ll62xGQgTNfODmdwWBse"
            ]
          }
        },
        {
          "Id": "0vN2c6B9pzgnKa3bYeP7nbVjjyf2",
          "Access": {
            "Permission": 1,
            "ReportIds": [
              "P9uiMYRAPjXZziB4f9hq"
            ]
          }
        }
      ]
    };
    setDoc(destDoc, currentAccesses, { merge:true })
    .then(destDoc => {
        console.log(`Users imported successfully`);
    })
    .catch(error => {
        console.log(error);
    })

  }
  const panama =
  {
    "Document": {
      "Date": "2023-02-26T15:33:02.5631732-05:00",
      "Language": 2
    },
    "Job": {
      "Type": 0,
      "OrderNbr": "P0921594",
      "Start": "2023-02-26T15:33:01.7649786-05:00",
      "End": "2023-02-26T15:33:01.7649786-05:00",
      "Completed": false
    },
    "ContactInfo": {
      "Organisation": "Fundacíon Simjati",
      "Name": "Tamy Tesone",
      "Title": "Program and services coordinator",
      "Email": "direccion@simjati.org",
      "Phone": "+507 6672-9198‬",
      "Website": "https://www.simjaticlub.com",
      "Address": {
        "Street": "Residencia 55, Calle 81 Este, Altos del Golf, San Francisco, Corregimiento de Parque Lefevre",
        "City": "Panama City",
        "Province": 10,
        "Country": "Panama",
        "Code": ""
      }
    },
    "Products": [
      {
        "Source": 2,
        "Code": "1795",
        "Description": "SOFTROCKER BLUE/TEAL",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "20698R",
        "Description": "WATER TREATMENT FLUID BCB",
        "Quantity": 4,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "20878R",
        "Description": "WIFI LED SPOTLIGHT",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "21098RO",
        "Description": "SENSORY MAGIC",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "21507",
        "Description": "AURA LED PROJECTOR",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "22869R",
        "Description": "MULTIFINITY EXPLORER",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "22873R",
        "Description": "COLOUR CATCH COMBO",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "31053MAG",
        "Description": "FOREST EFFECT WHEEL MAGNETIC",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "32401",
        "Description": "FIBER OPTIC LIGHT ENCLOSURE",
        "Quantity": 2,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "34280MAG",
        "Description": "WILDERNESS EFFECT WHEEL MAGNETIC",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "37969",
        "Description": "LASER STARS PROJECTOR",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "38967",
        "Description": "OPTIMUSIC 8-BEAM UNIT W/COMPUTER PFA NF9",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "39005",
        "Description": "DIAMOND BUBBLE WALL NF7",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "39019",
        "Description": "CUSTOM ACRYLIC MIRROR 96X48 IN OML",
        "Quantity": 3,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "39043MAG",
        "Description": "WHALES WHEEL NS8 MAGNETIC",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "39046MAG",
        "Description": "ORGANIC WHEEL MAGNETIC",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "39061",
        "Description": "AROMA SENSORY KIT",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "39076",
        "Description": "LED FLOOR PANEL",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "39993",
        "Description": "78 IN PLASTIC FIBER BUNDLE 200 STRAND",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "40341",
        "Description": "ROCKER GLIDER CHAIR LPS",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41148",
        "Description": "WIFI WIRELESS CONTROLLER",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41541",
        "Description": "INTERACTIVE LED LIGHT ENGINE",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41576",
        "Description": "MAXI BUBBLE TUBE 80 IN TUBE ONLY",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41643",
        "Description": "CURVED FIBER OPTIC COMB TRKAA",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41655",
        "Description": "WIFI COLOR WALL WASHER",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41671",
        "Description": "MAXI BUBBLE TUBE CHASSIS SLIM PROFILE",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41690",
        "Description": "BALLS IN BUBBLE TUBE 80 IN LED",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41721",
        "Description": "SOUND SHELL WITH MP3OPTION",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41743",
        "Description": "QUADRANT BUBBLE TUBE BASE 48 IN",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41765",
        "Description": "LEARNING WALL QUARTER CIRCLE LEFT",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41767",
        "Description": "LEARNING WALL DIP B",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41768",
        "Description": "LEARNING WALL CURVE B",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41770",
        "Description": "LEARNING WALL QUARTER CIRCLE RIGHT",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41818",
        "Description": "SHELF STEREO SYSTEM",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "42080",
        "Description": "ULTRA SHORT THROW PROJECTOR",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "42081",
        "Description": "ULTRA SHORT THROW PROJECTOR MOUNT ONLY",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "42248",
        "Description": "UNIV FLAT WALL MTN FOR 10-24 IN DISPLAY",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "42463",
        "Description": "INTERACTIVE LIGHT TABLE LPS",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "43274",
        "Description": "INTERACTIVE MOBILE FLOOR CUBE",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "43682",
        "Description": "SOIL GUARD SOUND SHELL CHAIR",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "8315MAG",
        "Description": "DEEP EFFECT WHEEL MAGNETIC",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "8405E",
        "Description": "12 IN CLEAR MIRROR BALL",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "8420MAG",
        "Description": "CLOUD EFFECT WHEEL MAGNETIC",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "8430",
        "Description": "COLORED LIGHT SPRAY 78 IN 200 STRAND PFA",
        "Quantity": 1,
        "Serials": [],
        "Trained": false
      }
    ],
    "TrainedStaff": [
      "Cedrick",
      "Jamie"
    ],
    "Notes": {
      "Comments": "",
      "Issues": "",
      "Feedback": ""
    }
  }
  const beaubien = {
    "Document": {
      "Date": "0001-01-01T00:00:00",
      "Language": 0
    },
    "Job": {
      "Type": 0,
      "OrderNbr": null,
      "Start": "2023-02-27T08:15:25.7059571-05:00",
      "End": "2023-02-27T08:15:25.7093293-05:00",
      "Completed": false
    },
    "ContactInfo": {
      "Organisation": "",
      "Name": "",
      "Title": "Program and services coordinator",
      "Email": "",
      "Phone": "",
      "Website": "",
      "Address": {
        "Street": "",
        "City": "Montréal",
        "Province": 10,
        "Country": "Canada",
        "Code": ""
      }
    },
    "Products": [
      {
        "Source": 2,
        "Code": "20191R",
        "Description": "MUSICAL WATERBED SINGLE NO HEATER/AMP",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "20191R",
        "Description": "MUSICAL WATERBED SINGLE",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "21098RO",
        "Description": "SENSORY MAGIC",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "39078",
        "Description": "WALL MOUNTED BUBBLING WATER PANEL",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "40144",
        "Description": "VARIABLE AXIS SWING",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "40152",
        "Description": "HEIGHT ADJUSTMENT SYSTEM",
        "Quantity": 5.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41460",
        "Description": "DREAM LOUNGER",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41545",
        "Description": "ADJUSTABLE ANGLE SWING FOOT RESTS",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "41838",
        "Description": "CUSTOM ACRYLIC MIRROR",
        "Quantity": 2.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "42080",
        "Description": "ULTRA SHORT THROW PROJECTOR",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "42081",
        "Description": "ULTRA SHORT THROW PROJECTOR MOUNT ONLY",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "42248",
        "Description": "UNIV FLAT WALL MTN FOR 10-24 IN DISPLAY",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "43519",
        "Description": "WATERBED HEATER ONLY",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "70C15",
        "Description": "FLOOR CUSHION PER SQFT MULTIPLE PCS",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "70C15",
        "Description": "FLOOR CUSHION PER SQFT 6 IN THICK",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "7262",
        "Description": "LEAF CHAIR",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "7266",
        "Description": "LEAF CHAIR STAND",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "99ZX01795",
        "Description": "CUSTOM STEPS FOR BUBBLE TUBE BASE",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "99ZX01795",
        "Description": "EDGE BLOCK MULTIPLE PCS",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "99ZX01795",
        "Description": "WALL CUSHIONS MULTIPLE PIECES",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 2,
        "Code": "99ZX01795",
        "Description": "EDGE BLOCK PER SQ FT MULTIPLE PCS",
        "Quantity": 1.0,
        "Serials": [],
        "Trained": false
      }
    ],
    "TrainedStaff": [
      "Cedrick",
      "Jamie"
    ],
    "Notes": {
      "Comments": "",
      "Issues": "",
      "Feedback": ""
    }
  }
  const granby = {
    "Document": {
      "Date": "2023-03-01T21:00:00",
      "Language": 2
    },
    "Job": {
      "Type": 0,
      "OrderNbr": "NSOPP6764",
      "Start": "2023-03-07T08:00:00.0297191-05:00",
      "End": "2023-03-09T18:02:08.0307181-05:00",
      "Completed": false
    },
    "ContactInfo": {
      "Organisation": "Cégep de Granby",
      "Name": "Stéphanie Santerre",
      "Title": "Technicienne en travaux pratiques",
      "Email": "ssanterre@cegepgranby.qc.ca",
      "Phone": "450-372-6614, poste 1363",
      "Website": "https://cegepgranby.ca/",
      "Address": {
        "Street": "235 Rue Saint-Jacques",
        "City": "Granby",
        "Province": 10,
        "Country": "Canada",
        "Code": "J2G 3N1"
      }
    },
    "Products": [
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      }
    ],
    "TrainedStaff": [
      "John"
    ],
    "Notes": {
      "Comments": "",
      "Issues": "",
      "Feedback": ""
    }
  }
  const cranby = {
    "Document": {
      "Date": "2023-03-01T21:00:00",
      "Language": 2
    },
    "Job": {
      "Type": 0,
      "OrderNbr": "NSOPP6764",
      "Start": "2023-03-07T08:00:00.0297191-05:00",
      "End": "2023-03-09T18:02:08.0307181-05:00",
      "Completed": false
    },
    "ContactInfo": {
      "Organisation": "Cégep de Granby",
      "Name": "Stéphanie Santerre",
      "Title": "Technicienne en travaux pratiques",
      "Email": "ssanterre@cegepgranby.qc.ca",
      "Phone": "450-372-6614, poste 1363",
      "Website": "https://cegepgranby.ca/",
      "Address": {
        "Street": "235 Rue Saint-Jacques",
        "City": "Granby",
        "Province": 10,
        "Country": "Canada",
        "Code": "J2G 3N1"
      }
    },
    "Products": [
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      },
      {
        "Source": 0,
        "Code": "",
        "Description": "",
        "Quantity": 0.0,
        "Serials": [],
        "Trained": false
      }
    ],
    "TrainedStaff": [
      "John"
    ],
    "Notes": {
      "Comments": "",
      "Issues": "",
      "Feedback": ""
    }
  }
  async function addReport(reportId, reportJSON) {

    const destDoc = doc(db, 'reports', reportId);
    setDoc(destDoc, reportJSON, { merge:true })
    .then(destDoc => {
        console.log(`Document added successfully`);
    })
    .catch(error => {
        console.log(error);
    })

  }
}
main();