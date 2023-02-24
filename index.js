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
  where
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
var form = document.getElementById("signinForm");

var currentUser = null;
var autoSignOutComplete = false;

async function main() {

  $(document).ready(function() {
    // one-time items once after doc is ready
    // don't refresh the page when the login button is clicked
    $("#signinForm").submit(function(e) {
      e.preventDefault();
    });
    signinBtn.addEventListener("click", signinClicked);
    signoutBtn.addEventListener("click", signoutFirebase);
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
      currentUser = user;
      // only log to the console a change if it was done manually
      if(autoSignOutComplete) {
        if (signedIn) {
          console.log(`user ${currentUser.uid} successfully signed in at ${new Date()}`);
          // signinBtn.removeEventListener("click", signinClicked);
          initialReportsLoad();
          // subscribeReportIteration();

          // add new JSON file to reports collection
          // true | false [Jules Leger, Beaubien, Centre Le Cap]
    
        } else {
          console.log(`user ${currentUser} successfully signed out at ${new Date()}`);
          wrapperSignin.style.display = 'block';
            // unsubscribeReportIteration();
    
        }
      }
    }
  });
  async function signinClicked() {
    const signin = await signInWithEmailAndPassword(auth, 'seanglover.spg@gmail.com', 'fd727236-6e61-4f6d-aa48-61c5e6ef514d')
    .then((userCredential) => {
      // ....... do something

    }).catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(`${errorCode}: ${errorMessage}`);
      // ....... do something
      
    });
  }
  async function signoutFirebase() {
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
    const q = query(collection(db, 'reports'), where('ContactInfo', "!=", ''));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      console.log(doc.id, " => ", doc.data());
      if(doc.id != 'Centre Le Cap') {
        updateReportHTML(doc);
      }
    });
    window.scrollTo(0, document.body.scrollHeight);
  }

  async function updateReportHTML(queryDoc) {

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
    clone.open = true; // set this programatically

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
}
main();