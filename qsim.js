/*
  Queueing system simulation within a browser script.

  Javascript program by Geoff Pritchard, Dept of Statistics, University of Auckland.
  Mersenne Twister RNG code by Takuji Nishimura and Makoto Matsumoto - see copyright notice below.

*/
//--------------------------------------------------------------------------------------------------
// Some functions for tending the HTML input page.

//---------------------
// Set up the page on initial loading.

function input_setup()
{
 // Put in one queue:
 input_add_queue();

 // Put in arrival process inputs:
 var tr = document.getElementById("arr");
 tr.appendChild(dist_input_cell("arr_dist",0));
 set_dist_parameter_input_boxes("arr_dist");
 tr.appendChild(routing_input_cell("arr_routing", 1, document.getElementById("q0_name").value));  // initial routing to q0
}

//---------------------
// Add another queue to the input table.

function input_add_queue()
{
 var tr,num_queues;

 // Count how many queues we have already:
 for(num_queues=0; document.getElementById("q"+num_queues) != null; num_queues++)
       ;

 // Make up a row for the new queue:
 tr = document.createElement('tr');
 tr.id = "q" + num_queues;
 tr.appendChild(new_table_cell(0, "<input id=" + tr.id + "_name type=text size=10 value=Q" + (num_queues+1) + ">"));
 tr.appendChild(new_table_cell(1, "<input id=" + tr.id + "_cap type=text size=6 value='unlimited'>"));
 tr.appendChild(new_table_cell(0, "<input id=" + tr.id + "_num_servers type=text size=2 value='1'>"));
 tr.appendChild(dist_input_cell(tr.id + "_serv_dist", 1));
 tr.appendChild(routing_input_cell(tr.id + "_routing", 0, "exit"));
 document.getElementById("q_input_table").appendChild(tr);

 set_dist_parameter_input_boxes(tr.id + "_serv_dist");
}

//---------------------
// Create and return a new table cell object for inputting a distribution.

function dist_input_cell(id, pos)
{
 var td = new_table_cell(pos, "");
 td.id = id;

 td.innerHTML = "<select id=" + id + "_type " +     // selector for distn type
          "onchange=\"set_dist_parameter_input_boxes('" + id + "')\">" +
          "<option>exponential</option>" +
          "<option>deterministic</option>" +
          "<option>uniform</option>" +
          "<option>normal</option>" +
          "<option>lognormal</option>" +
          "</select>" +
          "<div id=" + id + "_params>" +       // space for parameter input boxes (will be filled later)
          "</div>";

 return td;
}

//---------------------
// Create and return a new table cell object for inputting a routing.

function routing_input_cell(id, pos, dest)
{
 var td = new_table_cell(pos, "");
 td.id = id;

 td.innerHTML = "<input id=" + id + "_dest type=text size=8 value=\"" + dest + "\" " +
         "onchange=\"set_routing_policy_boxes('" + id + "')\">" +
         "<div id=" + id + "_policy></div>" +             // for policy selector, if required
         "<div id=" + id + "_policy_params></div>";       // for policy parameters box, if required

 return td;
}

//---------------------
// Create and return a new table cell object, with specified content.

function new_table_cell(pos, content)
{
 var td = document.createElement('td');
 td.align = "center";
 td.className = (pos % 2 == 0) ? "even" : "odd";
 td.innerHTML = content;
 return td;
}

//---------------------
// Set the parameter input boxes for a distribution, once the distribution type has been chosen.
// Requires the id of the table cell in which those boxes live.

function set_dist_parameter_input_boxes(id)
{
 var type = document.getElementById(id + "_type").value;  // the distn type selected
 var loc = document.getElementById(id + "_params");       // where to put the boxes

 loc.innerHTML = (type == "exponential")   ? " rate: <input id=" + id + "_rate type=text size=4>" :
                 (type == "deterministic") ? " value: <input id=" + id + "_value type=text size=4>" :
                 (type == "uniform")       ? " from <input id=" + id + "_a type=text size=4> to <input id=" + id + "_b type=text size=4>" :
                 (type == "normal" || type == "lognormal") ?
                                      " mean: <input id=" + id + "_mean type=text size=4> sd: <input id=" + id + "_sd type=text size=4>" :
                                             ".";
}

//---------------------
// Set the policy input boxes for a routing input, once the destination(s) have been chosen.
// Requires the id of the table cell in which those boxes live.

function set_routing_policy_boxes(id)
{
 var dests = split2(document.getElementById(id + "_dest").value, ","); // array of destination names
 var loc1 = document.getElementById(id + "_policy");                   // location of policy selector, if needed
 var loc2 = document.getElementById(id + "_policy_params");            // location of probs box, if needed
 var sel;

 if(dests.length <= 1)
   loc1.innerHTML = loc2.innerHTML = "";
 else
 {
   if((sel = document.getElementById(id + "_type")) == null)   // put in policy selector, if we don't have it already
   { 
     loc1.innerHTML = "<select id=" + id + "_type " +  
          "onchange=\"set_routing_policy_boxes('" + id + "')\">" +
          "<option>join shortest queue</option>" +
          "<option>random</option>" +
          "</select>"
     loc2.innerHTML = "";
   }
   else if(sel.value == "join shortest queue")
     loc2.innerHTML = "";
   else
     loc2.innerHTML = "probabilities: <input id=" + id + "_probs type=text size=8>";
 }
}

//---------------------
// Split a string into an array of strings, with whitespace trimmed off the ends.

function split2(str, sep)
{
 var x,i;

 x = str.split(sep);

 for(i=0; i<x.length; i++)
   x[i] = x[i].replace(/^\s*(\S*(?:\s+\S+)*)\s*$/, "$1");

 return x;
}

//--------------------------------------------------------------------------------------------------
// Functions for input validation.

//---------------------
// Validate all the input on the web page. Return true/false indicating if all is OK.

function validate_input()
{
 var n, qname, qnames, i, ok=true;

 // First, collect the list of queue names, and check that all are distinct:
 qnames = new Array();
 for(n=0; document.getElementById("q"+n) != null; n++)
 {
   qname = document.getElementById("q" + n + "_name").value;
   qnames.push(qname);
   for(i=0; i<qnames.length-1; i++)
     if(qname == qnames[i])
     {
       alert("The queues need to be given distinct names.");
       return false;
     }
 }

 // Check the arrival process inputs:
 ok = ok && validate_distn("arr_dist", "For the inter-arrival times,");
 ok = ok && validate_routing("arr_routing", "For the initial routing,", qnames);
 if( !ok )
   return false;

 // Check the queue(s) inputs:
 for(n=0; n < qnames.length; n++)
 {
   ok = ok && validate_nonempty("q" + n + "_name", "The name of queue " + (n+1));
   ok = ok && validate_numeric("q" + n + "_cap" , "The capacity (maximum occupancy) of queue \"" + qnames[n] + "\"", "++iu");
   ok = ok && validate_numeric("q" + n + "_num_servers" , "The number of servers at queue \"" + qnames[n] + "\"", "++i");
   ok = ok && validate_distn("q" + n + "_serv_dist", "For the service times in queue \"" + qnames[n] + "\",");
   ok = ok && validate_routing("q" + n + "_routing", "For the onward routing from queue \"" + qnames[n] + "\",", qnames);
   if( !ok )
     return false;
 }

 // Check the simulation-design inputs:
 ok = ok && validate_numeric("sd_num_runs", "The number of runs", "++i");
 ok = ok && validate_numeric("sd_dur_warmup", "The duration of the warmup period", "+");
 ok = ok && validate_numeric("sd_dur_data", "The duration of the data-collection period", "++");
 ok = ok && validate_numeric("sd_seed", "The random number seed", "+i");

 return ok;
}

//---------------------
// Validate a distribution input. Return true/false indicating if all is OK.

function validate_distn(id, desc)
{
 switch(document.getElementById(id + "_type").value)
 {
  case "exponential":
    return validate_numeric(id + "_rate", desc + " the rate", "++");
  case "deterministic":
    return validate_numeric(id + "_value", desc + " the value", "++");
  case "uniform":
    return validate_numeric(id + "_a", desc + " the minimum value", "+") &&
           validate_numeric(id + "_b", desc + " the maximum value", "++");
  case "normal":
  case "lognormal":
    return validate_numeric(id + "_mean", desc + " the mean", "++") &&
           validate_numeric(id + "_sd", desc + " the standard deviation", "++");
 }
}

//---------------------
// Validate a routing input. Return true/false indicating if all is OK.

function validate_routing(id, desc, qnames)
{
 var dests,i,j,probs,sum;

 if(!validate_nonempty(id + "_dest", desc + " the destination"))
   return false;

 // Check that all the destination names are valid queue names (or "exit"):
 dests = split2(document.getElementById(id + "_dest").value, ",");
 for(i=0; i<dests.length; i++)
 {
   if(dests[i] == "exit")
     continue;
   for(j=0; j<qnames.length && dests[i] != qnames[j]; j++)
      ; 
   if(j == qnames.length)
   {
     alert(desc + " the destination \"" + dests[i] + "\" is not the name of a queue.");
     return false;
   }
 }

 // Deterministic routing: nothing more to check:
 if(dests.length == 1)
   return true;

 // JSQ routing: just need to check that "exit" isn't a destination:
 if(document.getElementById(id + "_type").value == "join shortest queue")
 {
   if(dests.join().indexOf("exit") < 0)
     return true;
   else
   {
     alert(desc + " the join-shortest-queue rule cannot choose the exit.");
     return false;
   }
 }

 // Random routing: have to check the probabilities as well:
 if(!validate_nonempty(id + "_probs", desc + " the probability distribution"))
   return false;

 probs = split2(document.getElementById(id + "_probs").value, ",");
 if(probs.length != dests.length)
 {
   alert(desc + " there should be " + dests.length + " probabilities.");
   return false;
 }
 sum = 0; ok = true;
 for(i=0; i<probs.length; i++)
 {
   ok = ok && probs[i] >= 0 && probs[i] <= 1;
   sum += (probs[i] - 0);
 }
 ok = ok && Math.abs(sum - 1.0) < 1e-6;
 if(!ok)
 {
   alert(desc + " the probability distribution should be a list of non-negative numbers adding up to 1.");
   return false;
 }

 return true;
}

//---------------------
/* Validate the numeric input with given id. Return true/false indicating if all is OK.
  The string 'req' indicates what is required:
   '+' a non-negative quantity
   '++' a strictly positive quantity
   'i' an integer
   'u' the word "unlimited" is also acceptable
*/

function validate_numeric(id, desc, req)
{
 var s,x;

 if(!validate_nonempty(id, desc) )
   return false;

 s = document.getElementById(id).value;

 if(req.indexOf("u") >= 0 && s == "unlimited")
   return true;

 x = s - 0;
 if(s != x)
 {
   alert(desc + " should be a number.");
   return false;
 }
 
 if(req.indexOf("++") >= 0 && x <= 0)
 {
   alert(desc + " should be a postive quantity.");
   return false;
 }
 
 if(req.indexOf("+") >= 0 && x < 0)
 {
   alert(desc + " cannot be negative.");
   return false;
 }

 if(req.indexOf("i") >= 0 && x != Math.floor(x))
 {
   alert(desc + " should be an integer.");
   return false;
 }

 return true;
}

//---------------------
// Check non-emptiness of an input cell. Return true/false indicating if all is OK.

function validate_nonempty(id, desc)
{
 var bad;

 if(bad=(document.getElementById(id).value == ""))
   alert(desc + " has not been specified.");

 return !bad;
}

//--------------------------------------------------------------------------------------------------
// Functions for performing the simulation.

//---------------------
// Function to run the whole simulation.

function run_sim()
{
 var qs = new Queueing_system();
 var sim_design = new Sim_design();
 var obs = new Observations();
 var i,n;

 if( !validate_input() )
   return;

 sim_design.read();
 qs.read();

 var out = window.open().document.open(); 
 output_title(out);
 output_echo_inputs(out, qs, sim_design);

 var stats = new Stats(qs.num_queues);

 for(n=0; n<sim_design.num_runs; n++)
 {
   qs.gen_variates(sim_design, n);
   obs.reset(qs.num_queues);
   sim_single_run(out, qs, sim_design, obs); 
   stats.calc(obs, qs, sim_design);
 }

 output_large_table(out, qs, stats);
 out.close();
}

//---------------------
// Object: simulation design parameters.

function Sim_design()
{
 this.num_runs = 0;    // #runs
 this.dur_data = 0;    // run duration (data collection)
 this.dur_warmup = 0;  // run duration (warm-up)
 this.duration = 0;    // run duration (total)
 this.seed = 0;        // RNG seed

 this.read = sd_read;
}

//---------------------
// Object: (description of) multi-queue queueing system.

function Queueing_system()
{
 this.arr_stream = "";  // a Random_stream
 this.arr_routing = ""; // a Routing
 this.num_queues = 0;
 this.q = "";           // Array of Queues

 this.read = qs_read;
 this.gen_variates = gen_variates;     
}

//---------------------
// Object: (description of) queue.

function Queue(name, num_servers, cap, service_time_distn, onward_routing)
{
 this.name = name;
 this.num_servers = num_servers;
 this.cap = cap;
 this.serv_stream = new Random_stream(service_time_distn);
 this.onward_routing = onward_routing;
}

//---------------------
// Object: routing.

function Routing(type, dest, probs)
{
 this.type = type;   // "det" (deterministic), "rnd" (random), or "jsq" (join shortest queue)
 this.dest = dest;   // For "det", a queue index; for "rnd" or "jsq", a vector of queue indices
                     //     (for "det" or "rnd", index -1 denotes departing the system)
                     //     (for "jsq", the order of the indices indicates priority when there is a tie for shortest)
 this.stream = (type=="rnd") ? new Random_stream(new Distribution("fdi", "", "", dest, probs))  // stream of random routing decisions
                             : "";
 this.route = route;
 this.description = routing_description;
}

//---------------------
// Object: random-variate stream.

function Random_stream(distn)
{
 this.distn = distn;         // a Distribution
 this.variates = new Array();  // pre-generated values

 this.pregen = pregen;
 this.draw = draw;
}

//---------------------
// Object: probability distribution.

function Distribution(type, mean, sd, values, probs)
{
 this.type = type;      // "exp" (exponential), "det" (deterministic), "uni" (uniform),
                        // "tno" (truncated normal (positive-valued)), "lno" (lognormal), or "fdi" (finite discrete)
 this.mean = mean;
 this.sd = sd;          // for "tno", this is the sd of the un-truncated normal distn.
 this.values = values;  // for "fdi", the possible values
 this.probs = probs;    // for "fdi", the probabilities

 this.sample = sample;
 this.description = dist_description;
}

//---------------------
// Object: observations from a simulation run.

function Observations()
{
 this.reset = ob_reset;  // see this function for data members
}

//---------------------
// Object: summary statistics from simulation runs.
 
function Stats(num_queues)
{
 var i,j,n;

 this.q = new Array(num_queues);
 for(i=0; i<num_queues; i++)
 {
    this.q[i] = new Object();
    this.q[i].num_arrivals = new Array();
    this.q[i].arrival_rate = new Array();
    this.q[i].pdrop = new Array();
    this.q[i].pnowait = new Array();
    this.q[i].wq = new Array();
    this.q[i].ws = new Array();
    this.q[i].w = new Array();

    this.q[i].p = new Array();
    this.q[i].ls = new Array();
    this.q[i].lq = new Array();
    this.q[i].l = new Array();
 }

 this.sys = new Object();
 this.sys.num_arrivals = new Array();
 this.sys.arrival_rate = new Array();
 this.sys.w = new Array();
 this.sys.p = new Array();
 this.sys.l = new Array();;

 this.calc = single_run_stats;
}

//---------------------
// Queueing_system method: retrieve queueing system parameters from the web page.

function qs_read()
{
 var i,v;

 this.arr_stream = new Random_stream(read_distn("arr_dist"));
 this.arr_routing = read_routing("arr_routing");

 this.q = new Array();
 for(i=0; document.getElementById("q"+i) != null; i++)
 {
   this.q[i] = new Queue();
   this.q[i].name = document.getElementById("q" + i + "_name").value;
   this.q[i].num_servers = document.getElementById("q" + i + "_num_servers").value - 0;
   this.q[i].cap = (v = document.getElementById("q" + i + "_cap").value) == "unlimited" ? 0 : v - 0;
   this.q[i].serv_stream = new Random_stream(read_distn("q" + i + "_serv_dist"));
   this.q[i].onward_routing = read_routing("q" + i + "_routing");
 }
 this.num_queues = this.q.length;
}

//---------------------
// Retrieve description of a distribution from the HTML table cell with given id, and return the distribution.

function read_distn(id)
{
 var a,b;
 var d = new Distribution();

 d.type = document.getElementById(id + "_type").value.slice(0,3);  // first 3 chars of type description in selector
 if(d.type == "nor")  // normal (truncated)
   d.type = "tno";
 if(d.type == "log")  // lognormal
   d.type = "lno";

 switch(d.type)
 {
  case "exp":
    d.mean = 1 / document.getElementById(id + "_rate").value;
    break;
  case "det":
    d.mean = document.getElementById(id + "_value").value - 0;
    break;
  case "uni":
    a = document.getElementById(id + "_a").value - 0;
    b = document.getElementById(id + "_b").value - 0;
    d.mean = (a + b)/2;
    d.sd = (b - a)/Math.sqrt(12);
    break;
  case "tno":
  case "lno":
    d.mean = document.getElementById(id + "_mean").value - 0;
    d.sd   = document.getElementById(id + "_sd").value - 0;
    break;
 }

 return d;
}

//---------------------
// Retrieve description of a routing from the HTML table cell with given id, and return the routing.

function read_routing(id)
{
 var d,n,qname,i,t,p;

 // Convert the destinations to names of queues (or "exit"):
 d = split2(document.getElementById(id + "_dest").value, ",");
 for(i=0; i<d.length; i++)
 {
   if(d[i] == "exit")
   {
     d[i] = -1;
     continue;
   }
   for(n=0; (qname=document.getElementById("q"+n+"_name")) != null; n++)
     if(d[i] == qname.value)
     {
       d[i] = n;
       break;
     }
 }

 if(d.length == 1)
 {
   t = "det";
   d = d[0];
 }
 else
   t = (document.getElementById(id + "_type").value == "join shortest queue") ? "jsq" :
       (document.getElementById(id + "_type").value == "random")              ? "rnd" :
                                                                                ".";

 // Probabilities for random policy:
 if(t == "rnd")
 {
   p = split2(document.getElementById(id + "_probs").value, ",");
   for(i=0; i<p.length; i++)
     p[i] -= 0;
 }
 else
   p = "";

 return new Routing(t, d, p);
}

//---------------------
// Sim_design method: retrieve simulation design parameters from the web page.

function sd_read()
{
 this.num_runs = document.getElementById("sd_num_runs").value - 0;
 this.dur_data = document.getElementById("sd_dur_data").value - 0;
 this.dur_warmup = document.getElementById("sd_dur_warmup").value - 0;
 this.duration = this.dur_warmup + this.dur_data;
 this.seed = document.getElementById("sd_seed").value - 0;
}

//---------------------
// Queueing_system method: pre-generate the inter-arrival and service times, and random routing decisions, for one simulation run.
// Note the way the seeds are set, so that a simulation of a similar system will use common random elements.

function gen_variates(sim_design, run_no)
{
 var n,i;

 // Inter-arrival times:
 set_RNG_seed(sim_design.seed, run_no, -2);
 n = sim_design.duration / this.arr_stream.distn.mean;
 n = Math.floor(n + 6*Math.sqrt(n) + 10);
 this.arr_stream.pregen(n);

 // Arrival routing:
 if(this.arr_routing.type == "rnd")
 {
   set_RNG_seed(sim_design.seed, run_no, -1);
   this.arr_routing.stream.pregen(this.arr_stream.variates.length);
 }

 // Service times:
 for(i=0; i<this.num_queues; i++)
 {
   set_RNG_seed(sim_design.seed, run_no, 2*i);
   n = sim_design.duration * this.q[i].num_servers / this.q[i].serv_stream.distn.mean;
   n = Math.floor(n + 6*Math.sqrt(n) + 10);
   this.q[i].serv_stream.pregen(n);
 }

 // Onward routing:
 for(i=0; i<this.num_queues; i++)
   if( this.q[i].onward_routing.type == "rnd" )
   {
     set_RNG_seed(sim_design.seed, run_no, 2*i+1);
     this.q[i].onward_routing.stream.pregen(this.q[i].serv_stream.variates.length);
   }
}

//---------------------
// Object: customer (for use in simulation).

function Customer(system_entry_time)
{
 this.system_entry_time = system_entry_time;
 this.start_time = -1;   // time when started waiting or service in current queue
 this.finish_time = -1;  // time when service will finish (if in service)
}

//---------------------
// One simulation run.

function sim_single_run(out, qs, sim_design, obs)
{
 var dbg = false;  // debug output
 var qstate = new Array();
 var t, next_arr_time, i, j, next_t, qfrom, sfrom, qto, c, ns, warm, dt, n;

 for(i=0; i<qs.num_queues; i++)
   qstate[i] = new Array();

 t = 0;
 next_arr_time = qs.arr_stream.draw();

 if(dbg)
   out.write("<br>START simulation run<br>");

 for(;;)
 {
   // Figure out what the next event is:
   next_t = next_arr_time;
   qfrom = sfrom = -1;
   for(i=0; i<qs.num_queues; i++)
   {
     for(j=0; j < Math.min(qs.q[i].num_servers, qstate[i].length); j++)
       if(qstate[i][j].finish_time < next_t)
       {
         next_t = qstate[i][j].finish_time;
         qfrom = i;
         sfrom = j;
       }
   }
   if(next_t > sim_design.duration)
     next_t = sim_design.duration;

   warm = next_t > sim_design.dur_warmup;

   // Record the state of the system between times t and next_t
   if(warm)
   {
     dt = next_t - Math.max(t, sim_design.dur_warmup);
     for(i=0, n=0; i<qstate.length; i++)
     {
       record_occupancy(obs.q[i].occ, qstate[i].length, dt);
       n += qstate[i].length;
     }
     record_occupancy(obs.system_occ, n, dt);
   }

   if(next_t == sim_design.duration)
     break;

   t = next_t;

   // Update the state of the queues:
   if(qfrom < 0)  // Arrival
   {
     c = new Customer(t);
     if(dbg)
       out.write(t.toFixed(3), " : arrival<br>");
     qto = qs.arr_routing.route(qstate);
     next_arr_time = t + qs.arr_stream.draw();
     if(warm)
       ++obs.num_system_arrivals;
   }
   else           // Service completion
   {
     c = qstate[qfrom][sfrom];
     qstate[qfrom].splice(sfrom,1);
     if(dbg)
       out.write(t.toFixed(3), " : service completion in queue " + qfrom + "; queue length now " + qstate[qfrom].length, "<br>");
     if(warm)
       obs.q[qfrom].serv_times.push(t - c.start_time);
     ns = qs.q[qfrom].num_servers;
     if(qstate[qfrom].length >= ns)   // new customer enters service
     {
       if(warm)
         obs.q[qfrom].wait_times.push(t - qstate[qfrom][ns-1].start_time);
       qstate[qfrom][ns-1].start_time = t;
       qstate[qfrom][ns-1].finish_time = t + qs.q[qfrom].serv_stream.draw();
       if(dbg)
         out.write(t.toFixed(3), " : waiting customer enters service in queue ", qfrom,
                                 "; will finish at time " + qstate[qfrom][ns-1].finish_time.toFixed(3), "<br>");
     }
     qto = qs.q[qfrom].onward_routing.route(qstate);
   }

   if(qto < 0)  // customer 'c' exits system
   {
     if(dbg)
       out.write(t.toFixed(3), " : customer left system<br>");
     if(warm)
       obs.system_transit_times.push(t - c.system_entry_time);
   } 
   else // insert customer 'c' into queue 'qto'
   {
     if(qs.q[qto].cap==0 || qstate[qto].length < qs.q[qto].cap) // there's room
     {
       c.start_time = t;
       if(dbg)
         out.write(t.toFixed(3), " : customer entered queue " + qto + " (length now ", qstate[qto].length + 1, "); ");
       if(qstate[qto].length < qs.q[qto].num_servers)   // immediate service
       {
         c.finish_time = t + qs.q[qto].serv_stream.draw();
         if(dbg)
           out.write("entered service and will finish at time " + c.finish_time.toFixed(3), "<br>");
         if(warm)
           obs.q[qto].wait_times.push(0.0);
       }
       else
       {
         c.finish_time = -1;
         if(dbg)
           out.write("has to wait<br>");
       }
       qstate[qto].push(c);
     }
     else  // no room, customer dropped
     {
       if(dbg)
         out.write(t.toFixed(3), " : customer dropped; no room in queue "+ qto, "<br>");
       if(warm)
         ++obs.q[qto].num_drops;
     }
     if(warm)
       ++obs.q[qto].num_arrivals;
   }
 }

 if(dbg)
   out.write("END simulation run<br>");

}

//---------------------
// Record occupancy 'n' for a length of time 'dt'.

function record_occupancy(x, n, dt)
{
 var j;

  for(j=n; j>=0 && x[j] === undefined; j--)
    x[j] = 0;

  x[n] += dt;
}

//---------------------
// Observations method: reset for the start of a run.

function ob_reset(num_queues)
{
 var i;

 this.q = new Array(num_queues);
 for(i=0; i<num_queues; i++)
 {
   this.q[i] = new Object();
   this.q[i].num_arrivals = 0;
   this.q[i].num_drops = 0;
   this.q[i].wait_times = new Array();
   this.q[i].serv_times = new Array();
   this.q[i].occ = new Array();   // lengths of time for each occupancy level
 }

 this.system_transit_times = new Array();
 this.system_occ = new Array();   // system occupancy
 this.num_system_arrivals = 0;
}

//---------------------
// Stats method: calculate summary statistics from observations for a single run.

function single_run_stats(obs, qs, sim_design)
{
 var i,j,n,p,L,Lq,Ls;

 for(i=0; i<obs.q.length; i++)
 {
    this.q[i].num_arrivals.push(obs.q[i].num_arrivals);
    this.q[i].arrival_rate.push(obs.q[i].num_arrivals / sim_design.dur_data);
    this.q[i].pdrop.push(obs.q[i].num_drops / obs.q[i].num_arrivals);
    for(j=0, n=0; j<obs.q[i].wait_times.length; j++)
      if(obs.q[i].wait_times[j] == 0)
        ++n;
    this.q[i].pnowait.push(n / obs.q[i].wait_times.length);
    this.q[i].wq.push(mean(obs.q[i].wait_times));
    this.q[i].ws.push(mean(obs.q[i].serv_times));
    this.q[i].w.push(mean(obs.q[i].wait_times) + mean(obs.q[i].serv_times));

    p = new Array();
    for(j=0; j<obs.q[i].occ.length; j++)
      p[j] = obs.q[i].occ[j] / sim_design.dur_data;
    array_append(this.q[i].p, p, 0);

    Lq = Ls = 0;
    for(j=1; j<p.length; j++)
    {
      Lq += ((j > qs.q[i].num_servers) ? (j - qs.q[i].num_servers) : 0) * p[j];
      Ls += ((j > qs.q[i].num_servers) ?    qs.q[i].num_servers    : j) * p[j];
    }
    this.q[i].lq.push(Lq);
    this.q[i].ls.push(Ls);
    this.q[i].l.push(Lq + Ls);
    
/*
    this.q[i].p = new Array();
    for(j=0; j<obs.q[i].occ.length; j++)
      this.q[i].p[j] = obs.q[i].occ[j] / sim_design.dur_data;

    this.q[i].ls = this.q[i].lq = 0;
    for(j=1; j<this.q[i].p.length; j++)
    {
      this.q[i].lq += ((j > qs.q[i].num_servers) ? (j - qs.q[i].num_servers) : 0) * this.q[i].p[j];
      this.q[i].ls += ((j > qs.q[i].num_servers) ?    qs.q[i].num_servers    : j) * this.q[i].p[j];
    }
    this.q[i].l = this.q[i].ls + this.q[i].lq;
*/
 }

 this.sys.num_arrivals.push(obs.num_system_arrivals); 
 this.sys.arrival_rate.push(obs.num_system_arrivals / sim_design.dur_data);
 this.sys.w.push(mean(obs.system_transit_times));

 // System occupancies and lengths
 p = new Array();
 L = 0;
 for(j=0; j<obs.system_occ.length; j++)
 {
   p[j] = obs.system_occ[j] / sim_design.dur_data;
   L += j * p[j];
 }
 array_append(this.sys.p, p, 0);
 this.sys.l.push(L);
}

//---------------------
// Given an array of arrays x (all elements of x the same length) and an array y, append each y[i] to x[i].
// If x and y are of different lengths, pad the result with the element 'pad'.

function array_append(x, y, pad)
{
 var i;

 n = (x.length == 0) ? 0 : x[0].length;   // current length of each element of x

 // If y longer than x, pad x:
 for(i=x.length; i<y.length; i++)
   x.push(rep(pad, n));

 // Append each y[i] to x[i]:
 for(i=0; i<y.length; i++)
   x[i].push(y[i]);

 // If y shorter than x, pad y:
 for(i=y.length; i<x.length; i++)
   x[i].push(pad);
}

//---------------------

function output_title(out)
{
 out.write("<b>QUEUEING SIMULATION</b><br><br>");
}

//---------------------
// Write out a table recording the inputs to the simulation.

function output_echo_inputs(out, qs, sim_design)
{
 var i;

 out.write("<b>Customer arrival process:</b><br>");
 out.write("<table border=1 cellspacing=0 cellpadding=3>");
 out.write("<tr><td>Inter-arrival time distn:</td><td>", qs.arr_stream.distn.description(), "</td></tr>");
 out.write("<tr><td>Routing upon arrival to:</td><td>", qs.arr_routing.description(qs), "</td></tr>");
 out.write("</table><br>");

 out.write("<b>Queueing:</b><br>");
 out.write("<table border=1 cellspacing=0>");
 out.write("<tr><th></th><th>Capacity</th><th>No. servers</th><th>Service time distn.</th><th>Onward routing to</th></tr>");
 for(i=0; i<qs.num_queues; i++)
 {
   out.write("<tr><td>", qs.q[i].name, "</td>");
   out.write("<td>", qs.q[i].cap == 0 ? "unlimited" : qs.q[i].cap, "</td>");
   out.write("<td>", qs.q[i].num_servers, "</td>");
   out.write("<td>", qs.q[i].serv_stream.distn.description(), "</td>");
   out.write("<td>", qs.q[i].onward_routing.description(qs), "</td></tr>");
 }
 out.write("</table><br>");

 out.write("<b>Simulation details:</b><br>");
 out.write("<table border=1 cellspacing=0 cellpadding=3>");
 out.write("<tr><td>Number of runs:</td><td>", sim_design.num_runs, "</td></tr>");
 out.write("<tr><td>Run duration (warmup):</td><td>", sim_design.dur_warmup, "</td></tr>");
 out.write("<tr><td>Run duration (data collection):</td><td>", sim_design.dur_data, "</td></tr>");
 out.write("<tr><td>Random seed:</td><td>", sim_design.seed, "</td></tr>");
 out.write("</table><br>");

 out.write("<hr>");
}

//---------------------

function debug2(out, obs)
{
 var i,n,ok,v;

 out.write("<br><b>Observations:</b><br>");

 out.write("<table><tr><td></td>");
 for(i=0; i<obs.q.length; i++)
   out.write("<td>Queue ", i, "</td>");

 out.write("</tr><tr><td>#arrivals</td>");
 for(i=0; i<obs.q.length; i++)
   out.write("<td>", obs.q[i].num_arrivals, "</td>");

 out.write("</tr><tr><td>#drops</td>");
 for(i=0; i<obs.q.length; i++)
   out.write("<td>", obs.q[i].num_drops, "</td>");

 for(n=0, ok=1; ok>0; n++)
 {
   out.write("</tr><tr><td>occupancy ", n, " (time)</td>");
   ok = obs.q.length;
   for(i=0; i<obs.q.length; i++)
   {
     out.write("<td>", obs.q[i].occ[n], "</td>");
     if(obs.q[i].occ[n] === undefined)
       ok--;
   }
 }

/*
 out.write("</tr><tr><td>wait times</td>");
 for(i=0; i<obs.q.length; i++)
   out.write("<td>", col_string(obs.q[i].wait_times, 3), "</td>");

 out.write("</tr><tr><td>service times</td>");
 for(i=0; i<obs.q.length; i++)
   out.write("<td>", col_string(obs.q[i].serv_times, 3), "</td>");
*/

 out.write("</tr></table>");

 out.write("# system arrivals: ", obs.num_system_arrivals, "<br>");
 //out.write("System transit times:<br>", col_string(obs.system_transit_times, 3));
 out.write("System occupancy:<br>", a_to_str(obs.system_occ, 3, "<br>"), "<br>");
}

//---------------------
// Large output table showing individual run results.

function output_large_table(out, qs, stats)
{
 var i,n,ok;
 var blank = rep("<td></td>", stats.sys.w.length==1 ? 1 : 3 + stats.sys.w.length).join("");

 out.write("<b>Results:</b><br>");
 out.write("<table border=1 cellspacing=0><tr><th></th>");
 if(stats.sys.w.length > 1)
   out.write("<th>mean</th><th>sd</th><th bgcolor=gray></th>");
 for(i=1; i<=stats.sys.w.length; i++)
   out.write("<th>run ", i, "</th>");
 out.write("</tr>");

 if(qs.num_queues > 1)
 {
   out.write("<tr><td></td>", blank, "</tr>");
   out.write("<tr><td><b>System overall</b></td>", blank, "</tr>");
   out.write("<tr><td>Number of arrivals</td>", large_table_row(stats.sys.num_arrivals, 2, 0), "</tr>");
   out.write("<tr><td>Arrival rate</td>", large_table_row(stats.sys.arrival_rate, 3, 3), "</tr>");
   out.write("<tr><td>Mean time spent in system</td>", large_table_row(stats.sys.w, 3, 3), "</tr>");
   out.write("<tr><td>Mean number in system</td>", large_table_row(stats.sys.l, 3, 3), "</tr>");
   for(n=0; n<stats.sys.p.length; n++)
     out.write("<tr><td>P", n, "</td>", large_table_row(stats.sys.p[n], 4, 4), "</tr>");
 }
 
 for(i=0; i<stats.q.length; i++)
 {
   out.write("<tr><td></td>", blank, "</tr>");
   out.write("<tr><td><b>", qs.q[i].name, "</b></td>", blank, "</tr>");
   out.write("<tr><td>Number of arrivals</td>", large_table_row(stats.q[i].num_arrivals, 2, 0), "</tr>");
   out.write("<tr><td>Arrival rate</td>", large_table_row(stats.q[i].arrival_rate, 3, 3), "</tr>");
   if(qs.q[i].cap != 0)  // finite-capacity queues only
     out.write("<tr><td>P(denied entry)</td>", large_table_row(stats.q[i].pdrop, 4, 4), "</tr>");
   out.write("<tr><td>P(immediate service)</td>", large_table_row(stats.q[i].pnowait, 4, 4), "</tr>");
   out.write("<tr><td>Mean waiting time (Wq)</td>", large_table_row(stats.q[i].wq, 3, 3), "</tr>");
   out.write("<tr><td>Mean service time (Ws)</td>", large_table_row(stats.q[i].ws, 3, 3), "</tr>");
   out.write("<tr><td>Mean waiting + service time (W)</td>", large_table_row(stats.q[i].w, 3, 3), "</tr>");
   out.write("<tr><td>Mean number waiting (Lq)</td>", large_table_row(stats.q[i].lq, 4, 4), "</tr>");
   out.write("<tr><td>Mean number in service (Ls)</td>", large_table_row(stats.q[i].ls, 4, 4), "</tr>");
   out.write("<tr><td>Mean number waiting + in service (L)</td>", large_table_row(stats.q[i].l, 4, 4), "</tr>");
   for(n=0; n<stats.q[i].p.length; n++)
     out.write("<tr><td>P", n, "</td>", large_table_row(stats.q[i].p[n], 4, 4), "</tr>");
 }

 out.write("</table>");
}

//---------------------
// Generate and return (as a string) HTML table cells containing the mean, the standard deviation, a blank cell,
// and the individual elements of the given numeric array.
// If the array is of length 1, a simpler form is returned: just one cell with the single element.
// The mean and sd are to 'ndp1' decimal places; individual entries to 'ndp2' decimal places.

function large_table_row(a, ndp1, ndp2)
{
 var i,s;

 s = "";
 if(a.length > 1)
 {
   s += "<td>" + mean(a).toFixed(ndp1) + "</td>";
   s += "<td>" + sd(a).toFixed(ndp1) + "</td>";
   s += "<td bgcolor=gray></td>";
 }
 for(i=0; i<a.length; i++)
   s += "<td>" + a[i].toFixed(ndp2) + "</td>";

 return s;
}

//---------------------
// Routing method: find and return the destination indicated by a Routing.

function route(qstate)
{
 var qto,len,j;

 if(this.type == "det")
   qto = this.dest;
 else if(this.type == "rnd")
   qto = this.stream.draw();
 else // "jsq"
 {
   qto = this.dest[0];
   len = qstate[qto].length;
   for(j=1; j<this.dest.length; j++)
     if(qstate[this.dest[j]].length < len)
     {
       qto = this.dest[j];
       len = qstate[qto].length;
     }
 }
 
 return qto;  
}

//---------------------
// Routing method: return a string describing the routing.

function routing_description(qs)
{
 var i,s;

 if(this.type == "det")
   return this.dest < 0 ? "exit" : qs.q[this.dest].name;
 else
 {
   s = "";
   for(i=0; i<this.dest.length; i++)
     s += (i==0 ? "" : ", ") + (this.dest[i] < 0 ? "exit" : qs.q[this.dest[i]].name);
   if(this.type == "jsq")
     s += " (join shortest queue)";
   else
   {
     s += " (with probabilities ";
     for(i=0; i<this.stream.distn.probs.length; i++)
       s += (i==0 ? "" : ", ") + this.stream.distn.probs[i];
     s += ")";
   }
   return s; 
 }
}

//---------------------
// Random_stream method: pre-generate some variates, for later use.

function pregen(n)
{
 this.variates = this.distn.sample(n);
}

//---------------------
// Random_stream method: return a variate from the stream.

function draw()
{
 if(this.variates.length > 0)
   return this.variates.shift();
 else
   return this.distn.sample(1)[0];
}

//---------------------
// Distribution method: generate and return an iid sample.
// One standard uniform variate is used per sample variate, so that sampling from different distributions with the
//   same random seed will produce appropriately correlated variates.

function sample(n)
{
 var x = new Array();
 var u,v,w,i,j,p;
 var sqrt3 = Math.sqrt(3);

 for(i=0; i<n; i++)
 {
   u = Urand();
   if(this.type == "exp")
     v = -this.mean * Math.log(1-u);
   else if(this.type == "det")
     v = this.mean;
   else if(this.type == "uni")
     v = this.mean + sqrt3 * this.sd * (2*u - 1);
   else if(this.type == "tno")
     v = Math.max(0.0, this.mean + this.sd * qnorm(u));
   else if(this.type == "lno")   // lognormal
   {
     w = 1 + (this.sd * this.sd) / (this.mean * this.mean);
     v = Math.exp(Math.sqrt(Math.log(w)) * qnorm(u)) * this.mean / Math.sqrt(w);
   }
   else if(this.type == "fdi")
   {
     p = this.probs[0];
     for(j=0; j<this.probs.length && p < u; p += this.probs[++j])
          ;
     v = this.values[j];
   }
   else
     v = 0;
   x[i] = v;
 }

 return x;
}

//---------------------
// Distribution method: return a string describing the distribution.

function dist_description()
{
 switch(this.type)
 {
  case "exp":
    return "exponential, rate " + (1/this.mean);
  case "det":
    return "deterministic: " + this.mean;
  case "uni":
    return "uniform between " + (this.mean - Math.sqrt(3)*this.sd) + " and " + (this.mean + Math.sqrt(3)*this.sd);
  case "tno":
    return "normal: mean " + this.mean + ", sd " + this.sd + " (truncated to positive values)";
  case "lno":
    return "lognormal: mean " + this.mean + ", sd " + this.sd;
  case "fdi":
    return "finite discrete";
 }
}

//---------------------
// Set the random number generator seed for a given run and stream.

function set_RNG_seed(base_seed, n1, n2)
{
 init_by_array(new Array(base_seed, n1, n2, 5437), 4);
}

//---------------------
// Mean of numeric array.

function mean(a)
{
 var i,s;

 s = 0;
 for(i=0; i<a.length; i++)
   s += a[i]; 

 return s / a.length;
}

//---------------------
// Sample standard deviation of numeric array.

function sd(a)
{
 var i,m,s,d;

 m = mean(a);
 s = 0;
 for(i=0; i<a.length; i++)
 {
   d = a[i] - m;
   s += d*d;
 }
 return Math.sqrt(s / (a.length - 1));
}

//---------------------
// Create an array with identical elements.

function rep(v, n)
{
 var x = new Array(n);
 var i;

 for(i=0; i<n; i++)
   x[i] = v;

 return x;
}

//---------------------
// Convert a numeric array to a string, with the values printed to 'ndp' decimal places and separated by 'sep'.

function a_to_str(a, ndp, sep)
{
 var i,s;

 s = "";
 for(i=0; i<a.length; i++)
 {
   s = s + a[i].toFixed(ndp);
   if(i < a.length-1)
     s = s + sep;
 }

 return s; 
}

//-----------------------------------------------------------------------------
/* The quantile function (i.e. inverse distribution function) of the
   standard normal distribution. 
   See M. Wichura, "Algorithm AS 241: the percentage points of the normal
   distribution", Applied Statistics 37 (1988) 477-484.
*/

function qnorm(p)
{
 var a = new Array(3.3871327179, 50.434271938, 159.29113202, 59.109374720);
 var b = new Array(1.0         , 17.895169469, 78.757757664, 67.187563600);
 var c = new Array(1.4234372777, 2.7568153900, 1.3067284816, 0.17023821103);
 var d = new Array(1.0         , 0.7370016425, 0.12021132975,   0  ); 
 var e = new Array(6.6579051150, 3.0812263860, 0.42868294337, 0.017337203997);
 var f = new Array(1.0         , 0.24197894225, 0.012258202635, 0  );
 var q,x,r,sign;

 q = p - 0.5;
 if( Math.abs(q) <= 0.425 )
 {
   x = (0.425*0.425) - q*q;
   return q * (a[0] + x*(a[1] + x*(a[2] + x*a[3]))) /
              (b[0] + x*(b[1] + x*(b[2] + x*b[3])));
 }

 sign = p > 0.5 ? 1 : -1;
 if( p > 0.5 )
   p = 1 - p;
 r = Math.sqrt( - Math.log(p));
 if( r <= 5 )
 {
   x = r - 1.6;
   return sign * (c[0] + x*(c[1] + x*(c[2] + x*c[3]))) / 
                 (d[0] + x*(d[1] + x*d[2]));
 }
 else
 {
   x = r - 5;
   return sign * (e[0] + x*(e[1] + x*(e[2] + x*e[3]))) / 
                 (f[0] + x*(f[1] + x*f[2]));
 }

 return 0;
}

//--------------------------------------------------------------------------------------------------
// Mersenne Twister RNG code.

/* 
	This program is a JavaScript version of Mersenne Twister,
	conversion from the original program (mt19937ar.c),
	translated by yunos on december, 6, 2008.
	If you have any questions about this program, please ask me by e-mail.
	e-mail: info @ graviness.com


   A C-program for MT19937, with initialization improved 2002/1/26.
   Coded by Takuji Nishimura and Makoto Matsumoto.

   Before using, initialize the state by using init_genrand(seed)  
   or init_by_array(init_key, key_length).

   Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
   All rights reserved.                          

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:

     1. Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.

     2. Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.

     3. The names of its contributors may not be used to endorse or promote 
        products derived from this software without specific prior written 
        permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
   A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
   PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


   Any feedback is very welcome.
   http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
   email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
*/

//#include &lt;stdio.h&gt;

/* Period parameters */  
var N = 624;
var M = 397;
var MATRIX_A = 0x9908b0df;   /* constant vector a */
var UPPER_MASK = 0x80000000; /* most significant w-r bits */
var LOWER_MASK = 0x7fffffff; /* least significant r bits */

var mt = new Array(N); /* the array for the state vector */
var mti=N+1; /* mti==N+1 means mt[N] is not initialized */

/* initializes mt[N] with a seed */
function init_genrand(s)
{
    mt[0]= s >>> 0;
    for (mti=1; mti<N; mti++) {
        var s = mt[mti-1] ^ (mt[mti-1] >>> 30);
	    mt[mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253)
			+ mti;
        /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
        /* In the previous versions, MSBs of the seed affect   */
        /* only MSBs of the array mt[].                        */
        /* 2002/01/09 modified by Makoto Matsumoto             */
        mt[mti] >>>= 0;
        /* for >32 bit machines */
    }
}

/* initialize by an array with array-length */
/* init_key is the array for initializing keys */
/* key_length is its length */
/* slight change for C++, 2004/2/26 */
function init_by_array(init_key, key_length)
{
    var i, j, k;
    init_genrand(19650218);
    i=1; j=0;
    k = (N>key_length ? N : key_length);
    for (; k; k--) {
        var s = mt[i-1] ^ (mt[i-1] >>> 30)
        mt[i] = (mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525)))
          + init_key[j] + j; /* non linear */
        mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
        i++; j++;
        if (i>=N) { mt[0] = mt[N-1]; i=1; }
        if (j>=key_length) j=0;
    }
    for (k=N-1; k; k--) {
        var s = mt[i-1] ^ (mt[i-1] >>> 30);
        mt[i] = (mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941))
          - i; /* non linear */
        mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
        i++;
        if (i>=N) { mt[0] = mt[N-1]; i=1; }
    }

    mt[0] = 0x80000000; /* MSB is 1; assuring non-zero initial array */ 
}

/* generates a random number on [0,0xffffffff]-interval */
function genrand_int32()
{
    var y;
    var mag01 = new Array(0x0, MATRIX_A);
    /* mag01[x] = x * MATRIX_A  for x=0,1 */

    if (mti >= N) { /* generate N words at one time */
        var kk;

        if (mti == N+1)   /* if init_genrand() has not been called, */
            init_genrand(5489); /* a default initial seed is used */

        for (kk=0;kk<N-M;kk++) {
            y = (mt[kk]&UPPER_MASK)|(mt[kk+1]&LOWER_MASK);
            mt[kk] = mt[kk+M] ^ (y >>> 1) ^ mag01[y & 0x1];
        }
        for (;kk<N-1;kk++) {
            y = (mt[kk]&UPPER_MASK)|(mt[kk+1]&LOWER_MASK);
            mt[kk] = mt[kk+(M-N)] ^ (y >>> 1) ^ mag01[y & 0x1];
        }
        y = (mt[N-1]&UPPER_MASK)|(mt[0]&LOWER_MASK);
        mt[N-1] = mt[M-1] ^ (y >>> 1) ^ mag01[y & 0x1];

        mti = 0;
    }
  
    y = mt[mti++];

    /* Tempering */
    y ^= (y >>> 11);
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= (y >>> 18);

    return y >>> 0;
}

/* generates a random number on [0,0x7fffffff]-interval */
function genrand_int31()
{
    return (genrand_int32()>>>1);
}

/* generates a random number on [0,1]-real-interval */
function genrand_real1()
{
    return genrand_int32()*(1.0/4294967295.0); 
    /* divided by 2^32-1 */ 
}

/* generates a random number on [0,1)-real-interval */
function genrand_real2()
{
    return genrand_int32()*(1.0/4294967296.0); 
    /* divided by 2^32 */
}

/* generates a random number on (0,1)-real-interval */
function genrand_real3()
{
    return (genrand_int32() + 0.5)*(1.0/4294967296.0); 
    /* divided by 2^32 */
}

/* generates a random number on [0,1) with 53-bit resolution*/
function genrand_res53()
{ 
    var a=genrand_int32()>>>5, b=genrand_int32()>>>6; 
    return(a*67108864.0+b)*(1.0/9007199254740992.0); 
} 
/* These real versions are due to Isaku Wada, 2002/01/09 added */


//------------------------------------------------------------------------------------
// Some additional functions added by Geoff Pritchard.

/* To run mt_test, put something like
          <script type="text/javascript" src="MersenneTwisterRandom.js"></script>
          <input type="button" value="Test MT" onclick="mt_test()">
   in an HTML file.
*/

function mt_test()
{
    var i;
    var init = new Array(0x123, 0x234, 0x345, 0x456), length = init.length;
    init_by_array(init, length);
    var out = document.open("text/html");

    out.write("10 outputs of genrand_int32()<br>");
    for (i=0; i<10; i++) {
      out.write(genrand_int32(), "<br>");
    }
    out.write("<br>10 outputs of genrand_real2()<br>");
    for (i=0; i<10; i++) {
      out.write(genrand_real2(), "<br>");
    }
    out.close();

    return 0;
}

//-----------------------------------
// Random-number generator wrapper functions.

/** Set random number seed: */

function set_random_seed(seed)
{
 return init_genrand(seed);
}

/** Random integer in {0,...,m-1} : */

function modrand(m)
{
 return genrand_int32() % m;
}

/** Random uniform on (0,1) : */

function Urand()
{
 return genrand_real3();
}

