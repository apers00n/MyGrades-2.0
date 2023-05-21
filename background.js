function waitForElm(selector,query) {
    
  if(query||query==undefined){
  return new Promise(resolve => {
      if (document.querySelector(selector)) {
          return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver(mutations => {
          if (document.querySelector(selector)) {
              resolve(document.querySelector(selector));
              observer.disconnect();
          }
      });

      observer.observe(document.body, {
          childList: true,
          subtree: true
      });
  });}


  if(query==false){
      return new Promise(resolve => {
          if (selector!=undefined) {
              return resolve(selector);
          }
  
          const observer = new MutationObserver(mutations => {
              if (selector!=undefined) {
                  resolve(selector);
                  observer.disconnect();
              }
          });
  
          observer.observe(document.body, {
              childList: true,
              subtree: true
          });
      });}
}






 async function getGradedClasses(includeMissingAssignments=true, dateStart='first', dateEnd='today') { //Function to return a list of classes, each class an array with [points earned, total points, percent, letter, array with all asignments in the class]
  const today = new Date().toLocaleDateString(); //MM/DD/YYYY
  if (dateStart === 'first') {dateStart = '8/26/2019';}
  if (dateEnd === 'today') {dateEnd = today;}
  let allAssignments = await fetch('https://gannacademy.myschoolapp.com/api/webapp/context?').then(async (res) => {
    return await res.json().then(async (data) => {
      let fetchId = data.UserInfo.UserId;
      return await fetch("https://gannacademy.myschoolapp.com/api/DataDirect/AssignmentCenterAssignments/?format=json&filter=2&dateStart="+"8/28/2019"+"&dateEnd="+today+"&persona=2&statusList=&sectionList=").then(async (data) => {
        return await data.json().then(async (data) => { //data is now a json list of all assignments
          let filteredAssignments = data.filter((assignment) => { //Filter out the ones not wanted
            const date_due = new Date(assignment.date_due).getTime();
            return ((assignment.has_grade || (assignment.missing_ind && includeMissingAssignments)) && assignment.publish_grade && (includeMissingAssignments || !assignment.missing_ind) && (new Date(dateStart).getTime() <= date_due && date_due <= new Date(dateEnd).getTime()));
          });
          let allAssignments = filteredAssignments.map((assignment) => {
            return fetch("https://gannacademy.myschoolapp.com/api/datadirect/AssignmentStudentDetail?format=json&studentId=" + fetchId + "&AssignmentIndexId=" + assignment.assignment_index_id);
          });
          let jsonPromises = await Promise.all(allAssignments).then((res) => {
            return res.map((promise) => {return promise.json();});
          });

          allAssignments = await Promise.all(jsonPromises).then((res) => {
            return res.map((assignment) => {return assignment[0];});
          });

          return [allAssignments, filteredAssignments];
        });
      });
    })
  }); //allAssignments is now a list of all asignment
  const gradelessAssignments = allAssignments[1];
  allAssignments = allAssignments[0];
  //Create the classes letiable
  let classes = {};
  for (let [index, assignment] of allAssignments.entries()) { //Makes the class list then adds each assignemnt to its respective class and grades it
    let Class = classes[assignment.sectionName];
    if (!Class && ((!gradelessAssignments[index].missing_ind && assignment.pointsEarned) || gradelessAssignments[index].missing_ind)) {
      Class = [0, 0, 0, undefined]; //Points earned, max points, percent, letter, list of all assignments in that class
    } else if (((!gradelessAssignments[index].missing_ind && assignment.pointsEarned) || gradelessAssignments[index].missing_ind)) {
    //   Class[4].push(assignment);
    } else {continue;}

    Class[0] += assignment.pointsEarned;
    Class[1] += assignment.maxPoints;
    Class[2] = Class[0] / Class[1] * 100; //Percent
    if (Class[2] >= 97) { //Adds the letter grade
      Class[3] = "A+";
    } else if (Class[2] >= 93) {
      Class[3] = "A";
    } else if (Class[2] >= 90) {
      Class[3] = "A-";
  } else if (Class[2] >= 87) {
      Class[3] = "B+";
    } else if (Class[2] >= 83) {
      Class[3] = "B";
    } else if (Class[2] >= 80) {
      Class[3] = "B-";
  } else if (Class[2] >= 77) {
      Class[3] = "C+";
    } else if (Class[2] >= 73) {
      Class[3] = "C";
    } else if (Class[2] >= 70) {
      Class[3] = "C-";
  } else if (Class[2] >= 67) {
      Class[3] = "D+";
    } else if (Class[2] >= 63) {
      Class[3] = "D";
    } else if (Class[2] >= 60) {
      Class[3] = "D-";
  } else if (Class[2] < 59.99) {
      Class[3] = "F";
    }
    classes[assignment.sectionName] = Class;
  }
//   console.log(classes);
for (let [key, value] of Object.entries(classes)) {
    var Class = value;
  
    Class[2]=(Class[2].toFixed(2))+"%";
    Class[0]=Class[0].toFixed(2)+"/"+Class[1].toFixed(2)+" points";
    Class[1]=Class[2];
    Class[2]=Class[3];
    Class.pop();
    classes[key]=Class;
};
  return classes;
}
insertGrades();
window.addEventListener('hashchange', function() {
	insertGrades();
})

function insertGrades(){
    if(window.location.href.includes("progress")){
        getGradedClasses().then((data) =>{
            waitForElm("#coursesContainer > div:nth-child(1)").then((elm) => {
                for (let [key, value] of Object.entries(data)) {
                    // console.log(`${key}: ${value}`);
    
                var xpath = "//h3[text()='"+key+"']";
                var matchingElement = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                parent = matchingElement.parentElement.parentElement.parentElement;
    
                var letterGrade = parent.childNodes[7].childNodes[1]
                letterGrade.innerText = value[2];
                letterGrade.style.visibility = "hidden"

                const percent = document.createElement("h5"); 
                percent.innerHTML = '<h5 class="showGrade" style = "line-height: .5;">'+value[1]+'</h5>';
                const points = document.createElement("h5"); 
                points.innerHTML = '<h5 class="showGrade" style = "line-height: .5;">'+value[0]+'</h5>';
                letterGrade.appendChild(percent);
                letterGrade.appendChild(points);


                parent.childNodes[7].title = value[2]+"\n"+value[1]+"\n"+value[0];
    
                }
            });
        });
    }
}