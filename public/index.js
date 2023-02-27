import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js'; // 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js' firebase/app;
const firebaseConfig = {
    apiKey: "AIzaSyCxAomFX0E2EZl3aRsNuLY2BhebY2x3Rk0",
    authDomain: "sandbox-sean.firebaseapp.com",
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
  getDoc,
  setDoc,
  updateDoc,
  where,
  documentId
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js' // https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js 'firebase/firestore';

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
var form = document.getElementById("signinForm"); // work on this when submitted a message appears... thanks!

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
          // signinBtn.removeEventListener("click", signinClicked);
          // determine access level in initialReportsLoad() so that 0, 1 or more reports are loaded

          // userConfigs(); // <-- add new users

          initialReportsLoad();

          ///////// realtime updates
          // subscribeReportIteration();

          // add new JSON file to reports collection
          // true | false [Jules Leger, Beaubien, Centre Le Cap]
    
        } else {
          console.log(`user ${currentUser.uid} successfully signed out at ${new Date()}`);
          wrapperSignin.style.display = 'block';
            // unsubscribeReportIteration();
    
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
    var childrenReports = sectionReports.getElementsByTagName('details');
    for (var i=0, item; item = childrenReports[i]; i++) {
      if(item.id != 'detailsTemplate') {
        sectionReports.removeChild(item);
      }
      // else { sectionReports.display = 'block'; }
    }
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

    var signedInUser_hasProfile = auth.currentUser.uid in accessByUser;
    if(signedInUser_hasProfile) {
      var userAccess = accessByUser[auth.currentUser.uid];
      var accessToAll = userAccess.ReportIds.length == 0;
      var accessIds = accessToAll ? 'all' : userAccess.ReportIds.join('|');
      console.log(accessIds);
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
  function subscribeReportIteration() {

    const q = query(collection(db, 'reports'), orderBy('Document.Date', 'desc'));
    reportsListener = onSnapshot(q, snaps => {
      snaps.forEach(doc => {

      });
    });

  }

  async function updateReportHTML(queryDoc, openReport) {

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

    var submitBtn = clone.querySelector("#submitForm");
    submitBtn.style = 'background-color: #55acee; padding: 10px 30px 10px 30px;';
    submitBtn.addEventListener('click', function(e) {

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

    });

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
    textarea.val(text.replaceAll('■', '\n'));
    textarea.css('height', `${textarea.get(0).scrollHeight}px`);
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
    docCell.setAttribute('id', guidId);
    document.getElementById(guidId).innerHTML = text;
  }

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
          "Id": "YY5jIJ8NpgNiXVYn92fW72igNNM2",
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
        }
      ]
    };
    setDoc(destDoc, currentAccesses, { merge:true })
    .then(destDoc => {
        console.log(`Document copied successfully`);
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