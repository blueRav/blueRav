import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronRight, Clock, Leaf, Mail, MapPin, Menu as MenuIcon, Minus, Phone, Plus, Search, ShoppingBag, X } from "lucide-react";
import catalogue from "../../data/menu.json";
import { api, staticPreview } from "./api.mjs";
import { filterItems, formatMoney, groupMenuItems, localQuote, marketStatus, readPlan, updatePlan } from "./lib.mjs";
import "./styles.css";

const HERO = import.meta.env.BASE_URL + "images/hero.jpg";
const PHONE = "tel:+16106493193";
const categories = catalogue.categories || [{ id: "signature", label: "Signature rolls" }, { id: "cooked", label: "Cooked favorites" }, { id: "vegetarian", label: "Vegetarian" }];
const freshRequestKey = () => globalThis.crypto?.randomUUID?.() || "demo-" + Date.now().toString(36) + Math.random().toString(36).slice(2);

function App() {
  const [items, setItems] = useState(catalogue.items);
  const [backend, setBackend] = useState(false);
  const [status, setStatus] = useState(marketStatus());
  const [loading, setLoading] = useState(!staticPreview);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [diet, setDiet] = useState("all");
  const [plan, setPlan] = useState(() => readPlan(localStorage));
  const [planOpen, setPlanOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [cateringOpen, setCateringOpen] = useState(false);
  const menuHeading = useRef(null);
  useEffect(() => {
    let cancelled = false;
    if (!staticPreview) {
      Promise.all([api("menu"), api("restaurant")])
        .then(([menu, restaurant]) => {
          if (!cancelled) { setItems(menu.items); setStatus(restaurant.status); setBackend(true); }
        }).catch(() => { if (!cancelled) setBackend(false); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    const tick = setInterval(() => setStatus(marketStatus()), 60000);
    return () => { cancelled = true; clearInterval(tick); };
  }, []);
  useEffect(() => { try { localStorage.setItem("sushi-sei-pickup", JSON.stringify(plan)); } catch {} }, [plan]);
  const groups = useMemo(() => groupMenuItems(items), [items]);
  const filtered = useMemo(() => filterItems(groups, { query, category, diet }), [groups, query, category, diet]);
  const count = Object.entries(plan).reduce((total, [id, quantity]) => total + (items.some(item => item.id === id && Number.isInteger(item.price_cents)) ? quantity : 0), 0);
  function resetMenu() { setCategory("all"); setDiet("all"); setQuery(""); }
  function changeItem(item, quantity) {
    try { setPlan(current => updatePlan(current, item.id, quantity)); setAnnouncement(quantity ? item.name + " updated in your pickup plan." : item.name + " removed from your pickup plan."); }
    catch (error) { setAnnouncement(error.message); }
  }
  const closeNav = () => setNavOpen(false);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="Sushi Sei Express home"><span>SUSHI <b>SEI</b></span><small>EXPRESS</small></a>
      <nav className={navOpen ? "primary-nav is-open" : "primary-nav"} id="primary-nav" aria-label="Main navigation">
        <a href="#menu" onClick={closeNav}>Our menu</a><a href="#story" onClick={closeNav}>Our story</a><a href="#catering" onClick={closeNav}>Catering</a><a href="#visit" onClick={closeNav}>Find us <ArrowUpRight size={15} /></a>
      </nav>
      <div className="header-actions">
        <button className="plan-trigger" onClick={() => setPlanOpen(true)} aria-label={"Open pickup plan, " + count + " items"}><ShoppingBag size={18}/><span>Pickup plan</span><span className="plan-count">{count}</span></button>
        <button className="nav-toggle icon-button" aria-label={navOpen ? "Close navigation" : "Open navigation"} aria-expanded={navOpen} aria-controls="primary-nav" onClick={() => setNavOpen(!navOpen)}>{navOpen ? <X/> : <MenuIcon/>}</button>
      </div>
    </header>
    <main id="main">
      <section className="hero section-shell" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">A little market.<br/><em>A lot of sushi.</em></h1>
          <p>Freshly rolled at Ardmore Farmers Market. A quick lunch, a favorite to take home, or something delicious to share.</p>
          <div className="hero-actions"><a className="button button-dark" href="#menu">Find your favorite <ArrowRight size={18}/></a><a className="text-link" href={PHONE}>Give us a call <ArrowUpRight size={16}/></a></div>
          <div className="market-status"><span className={status.open ? "status-dot is-open" : "status-dot"}/><span>{status.label}</span><span className="status-divider"/><span>Ardmore, Pennsylvania</span></div>
        </div>
        <figure className="hero-visual">
          <div className="hero-image"><img src={HERO} width="1600" height="1067" alt="Illustrative close-up of salmon sushi rolls served on a dark platter" fetchPriority="high"/><span className="photo-stamp">Made fresh.<br/>Every day.</span></div>
          <figcaption><span>Good food. Your neighborhood.</span><span>A market-day favorite. <ArrowDown size={14}/></span></figcaption>
        </figure>
      </section>
      <div className="market-ribbon" aria-label="Restaurant highlights"><span>Rolled fresh daily</span><span className="ribbon-separator"/><span>Cooked & raw favorites</span><span className="ribbon-separator"/><span>Party trays, made to share</span></div>
      <section className="menu-section section-shell" id="menu" aria-labelledby="menu-title">
        <div className="section-heading"><h2 id="menu-title" ref={menuHeading}>Find your<br/><em>next favorite.</em></h2><div className="heading-aside"><p>The whole menu, right here. Small rolls, generous bowls, and party trays for a table full of friends.</p><a className="text-link" href="#sushi-guide">New to sushi? Start here <ArrowDown size={16}/></a></div></div>
        <div className="menu-controls"><p className="menu-intro">Choose your rice. Make a little list.<br/><span>Then call us to arrange the real thing.</span></p><div className="menu-search"><Search size={18} aria-hidden="true"/><label className="visually-hidden" htmlFor="menu-search">Search the menu</label><input id="menu-search" type="search" placeholder="A roll, ingredient, or platter" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button className="search-clear" aria-label="Clear menu search" onClick={() => setQuery("")}><X size={16}/></button>}</div></div>
        <div className="quick-finds"><span>A little inspiration:</span><button aria-pressed={diet === "cooked"} onClick={() => { setDiet(diet === "cooked" ? "all" : "cooked"); setCategory("all"); setQuery(""); }}>Keep it cooked <ChevronRight size={14}/></button><button aria-pressed={diet === "vegetarian"} onClick={() => { setDiet(diet === "vegetarian" ? "all" : "vegetarian"); setCategory("all"); setQuery(""); }}>Go green <Leaf size={13}/></button><button aria-pressed={query === "spicy"} onClick={() => { setDiet("all"); setCategory("all"); setQuery(query === "spicy" ? "" : "spicy"); }}>Bring the heat <ChevronRight size={14}/></button>{(query || diet !== "all") && <button className="reset-filters" onClick={resetMenu}>Reset filters <X size={13}/></button>}</div>
        <div className="menu-browser">
          <aside className="menu-index" aria-label="Menu categories"><div className="category-filters">{[{id:"all",label:"The full menu"}, ...categories].map(option => <button key={option.id} aria-pressed={category === option.id} className={category === option.id ? "category-button selected" : "category-button"} onClick={() => { setCategory(option.id); setDiet("all"); }}><span>{option.label}</span><span>{option.id === "all" ? groups.length : groups.filter(item => item.category === option.id).length}</span></button>)}</div><label className="mobile-category" htmlFor="menu-category">Browse the menu<select id="menu-category" aria-label="Browse the menu" value={category} onChange={event => { setCategory(event.target.value); setDiet("all"); }}><option value="all">The full menu ({groups.length})</option>{categories.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label><p className="index-note">Posted menu prices.<br/>Please call to confirm availability.</p></aside>
          <div className="menu-results"><p className="menu-count" role="status">{loading ? "Loading the menu…" : filtered.length + (filtered.length === 1 ? " menu favorite" : " menu favorites") + (category === "all" && diet === "all" && !query ? " to explore" : " found")}</p>
            {filtered.length ? categories.map(section => { const sectionItems = filtered.filter(item => item.category === section.id); return sectionItems.length ? <section className="menu-category-section" key={section.id} aria-labelledby={"menu-heading-" + section.id}><div className="category-heading"><h3 id={"menu-heading-" + section.id}>{section.label}</h3>{section.description && <p>{section.description}</p>}</div><div className="menu-grid">{sectionItems.map(item => <MenuItem key={item.id} group={item} plan={plan} changeItem={changeItem}/>)}</div></section> : null; }) : <div className="empty-menu"><Search size={30}/><h3>No favorites found this time.</h3><p>Try another ingredient or explore the full menu.</p><button className="button button-dark" onClick={resetMenu}>Show all favorites <ArrowRight size={16}/></button></div>}
            <p className="menu-note">{catalogue.price_note || "Prices from the restaurant’s posted menu. Call to confirm current prices and availability."} Please ask the team about allergens and shared preparation. Items without a posted price are available to discuss by phone.</p>
          </div>
        </div>
      </section>
      <section className="story-section" id="story" aria-labelledby="story-title"><div className="story-inner section-shell"><div className="story-quote"><span className="quote-mark" aria-hidden="true">“</span><p>All about sushi.<br/><em>All the time.</em></p><span>SUSHI SEI EXPRESS</span></div><div className="story-copy"><h2 id="story-title">A neighborhood stop.<br/>A craft worth sharing.</h2><p>At sixteen, Tu Truong took a part-time job bussing tables and washing dishes at Kawabata Japanese Restaurant, at Second and Chestnut in Philadelphia’s Old City. Watching the sushi chefs—and the precision of their knife work—gave him a new ambition.</p><p>A year later, owner Hiro-san offered him a Japanese sous-chef position. Under head chef Nobu-san, Tu learned the art of sushi and how to choose rice, fish, and vegetables with care.</p><p>Today, that craft is part of a market-day routine in Ardmore: freshly made sushi to grab and go, rolls made to order, and party trays prepared for the next gathering.</p></div><div className="story-values"><div><h3>Fresh. Simple. Delicious.</h3><p>The restaurant’s mission begins with good food and thoughtful service: respect for people and cultures, care in choosing suppliers, and investment in the team.</p></div><div><h3>A little less waste.</h3><p>The original site describes recycling glass, paper, aluminum, and plastic, alongside working with a local farmer to turn food waste into compost.</p></div></div></div></section>
      <section className="catering-section section-shell" id="catering" aria-labelledby="catering-title"><div className="catering-title"><h2 id="catering-title">Good things<br/><em>come in platters.</em></h2><p>Something for the office. Something for the family. Six party trays bring everyone to the table.</p></div><div className="catering-content"><div className="platter-options"><div><span>Vegetable lovers</span><p>Medium and large trays of vegetable dragons, inside-out rolls, and small rolls.</p></div><div><span>Cooked & raw assortment</span><p>A specialty-roll choice alongside a variety of cooked and raw favorites.</p></div><div><span>Nigiri & rolls</span><p>Tuna, salmon, yellowtail, eel, and cooked shrimp nigiri, with a selection of rolls.</p></div></div><p className="advance-note"><Clock size={17}/>Please arrange party trays at least 24 hours ahead.</p><p className="catering-inclusions">Party trays include pickled ginger, wasabi, chopsticks, and an 8 oz bottle of regular or low-sodium soy sauce. White and brown rice options are listed in the menu.</p><div className="catering-actions"><a className="button button-rust" href="#menu" onClick={() => { setCategory(categories.find(item => /party|platter|tray/i.test(item.label))?.id || "all"); setDiet("all"); setQuery(""); }}>Explore the party trays <ArrowUpRight size={17}/></a><button className="text-link" onClick={() => setCateringOpen(!cateringOpen)} aria-expanded={cateringOpen} aria-controls="catering-planner">{cateringOpen ? "Close the demo planner" : "Try the catering planner"}<ArrowRight size={16}/></button></div></div><div className="event-note"><h3>A gathering of your own?</h3><p>For catering and on-site events, talk with the restaurant about your date, guest count, menu, and arrangements. Event packages and rates are not listed on the original site.</p><a className="text-link" href={PHONE}>Let’s plan it together <Phone size={16}/></a></div>{cateringOpen && <CateringForm backend={backend}/>}</section>
      <section className="food-gallery section-shell" id="gallery" aria-labelledby="gallery-title"><div className="gallery-heading"><h2 id="gallery-title">Fresh from<br/><em>the sushi bar.</em></h2><p>A few favorites from the restaurant’s original website.</p></div><div className="gallery-photos"><figure><img src={import.meta.env.BASE_URL + "images/market-roll-1.jpg"} alt="Sushi Sei’s Rainbow Roll, topped with a colorful assortment of fish and avocado" loading="lazy" width="600" height="450"/><figcaption>Rainbow Roll</figcaption></figure><figure><img src={import.meta.env.BASE_URL + "images/market-roll-2.jpg"} alt="A freshly prepared sushi roll from the restaurant’s original website" loading="lazy" width="600" height="450"/><figcaption>From the restaurant’s sushi bar</figcaption></figure><figure><img src={import.meta.env.BASE_URL + "images/market-roll-3.jpg"} alt="A topped sushi roll from Sushi Sei’s original photo collection" loading="lazy" width="600" height="450"/><figcaption>A little inspiration for your next visit</figcaption></figure></div></section>
      <SushiGuide/>
      <section className="visit-section" id="visit" aria-labelledby="visit-title"><div className="visit-inner section-shell"><h2 id="visit-title">Meet you<br/><em>at the market.</em></h2><div className="visit-info"><div className="visit-block"><MapPin size={21}/><div><h3>Ardmore Farmers Market</h3><p>120 Coulter Avenue<br/>Ardmore, PA 19003</p><a className="text-link" href="https://www.google.com/maps/search/?api=1&query=Ardmore+Farmers+Market+120+Coulter+Avenue" target="_blank" rel="noreferrer">Get directions <ArrowUpRight size={15}/></a></div></div><div className="visit-block"><Clock size={21}/><div><h3>A fresh start, every day</h3><dl><div><dt>Monday – Saturday</dt><dd>9 am – 6 pm</dd></div><div><dt>Sunday</dt><dd>9 am – 4 pm</dd></div></dl><p className="hours-note">Hours from the restaurant’s website. Call for holiday changes.</p></div></div><a className="visit-phone" href={PHONE}><Phone size={20}/>610.649.3193<ArrowUpRight size={17}/></a><a className="visit-email text-link" href="mailto:it.sushi.sei@gmail.com"><Mail size={17}/>it.sushi.sei@gmail.com</a></div></div></section>
      <section className="market-extras section-shell" aria-label="More from Sushi Sei"><div><h2>A few good things<br/><em>to take home.</em></h2><p>The restaurant also shares its love of Japanese pantry staples: short-grain sushi rice, sesame oil, rice vinegar, chili sauce, soy sauce, tofu, wasabi, and pickled ginger. Ask the team what’s on the shelf.</p></div><div className="extras-detail"><div><h3>Made in the kitchen</h3><p>The site lists house-made ginger miso dressing, spicy mayonnaise, sweet chili, peanut, honey wasabi, and unagi sauces. Ask the team about ingredients and dietary needs.</p></div><div id="careers"><h3>Bring your curiosity.</h3><p>The original careers page lists part-time and full-time sushi chef and helper opportunities, including training without prior experience. It asks for reliability, teamwork, basic English and math, respect for Japanese culture, and a love of food. Call or visit to confirm current openings and application requirements.</p><a className="text-link" href={PHONE}>Ask about joining the team <ArrowUpRight size={15}/></a></div></div></section>
    </main>
    <footer className="site-footer section-shell"><a className="wordmark" href="#top"><span>SUSHI <b>SEI</b></span><small>EXPRESS</small></a><div className="footer-nav"><p>Fresh from the market.<br/>Made for your day.</p><a href="#sushi-guide">About sushi</a><a href="#gallery">Gallery</a><a href="#careers">Careers</a><a href="mailto:it.sushi.sei@gmail.com">Get in touch</a></div><div className="footer-details"><p>Independent portfolio redesign. Pickup plans and inquiries are demos.</p><a href="http://www.sushiseiexpress.com/home.html" target="_blank" rel="noreferrer">Visit the original restaurant website <ArrowUpRight size={13}/></a><small>Hero photograph: <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a>. Menu and gallery photographs: Sushi Sei Express. Business details checked October 20, 2026.</small></div></footer>
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</div>
    <PickupPlan open={planOpen} close={() => setPlanOpen(false)} items={items} plan={plan} changeItem={changeItem} backend={backend}/>
  </>;
}

function MenuItem({ group, plan, changeItem }) {
  const [selectedId, setSelectedId] = useState(group.variants[0].id);
  const item = group.variants.find(variant => variant.id === selectedId) || group.variants[0];
  const quantity = plan[item.id] || 0;
  const otherSelections = group.variants.filter(variant => variant.id !== item.id && plan[variant.id]);
  const priced = Number.isInteger(item.price_cents);
  return <article className="menu-item">
    <div className="menu-item-copy">{item.image && <img className="tray-image" src={import.meta.env.BASE_URL + item.image} alt={group.name + " from the restaurant’s original website"} width="640" height="480" loading="lazy"/>}<div className="menu-item-title"><h4>{group.name}</h4><span className={priced ? "menu-price" : "menu-price unpriced"}>{priced ? formatMoney(item.price_cents) : "Call for price"}</span></div>{item.description && <p>{item.description}</p>}
      <div className="menu-item-meta">{item.pieces && <span>{item.pieces} pieces</span>}{item.serves && <span>Serves {item.serves}</span>}{item.diet === "raw" ? <span>Contains raw seafood</span> : item.diet === "vegetarian" ? <span><Leaf size={12}/>Vegetarian</span> : item.diet === "cooked" ? <span>Cooked</span> : item.diet === "mixed" ? <span>Cooked & raw</span> : null}</div>
      {group.variants.length > 1 && <label className="rice-choice" htmlFor={"rice-" + group.id}><span>Rice</span><select id={"rice-" + group.id} aria-label={"Rice for " + group.name} value={item.id} onChange={event => setSelectedId(event.target.value)}>{group.variants.map(variant => <option key={variant.id} value={variant.id}>{variant.rice_label || (variant.rice === "brown" ? "Brown rice" : "White rice")} · {Number.isInteger(variant.price_cents) ? formatMoney(variant.price_cents) : "Call for price"}</option>)}</select></label>}
      {!!otherSelections.length && <p className="other-selection">Also in your plan: {otherSelections.map(variant => `${plan[variant.id]} × ${variant.rice_label || variant.rice + " rice"}`).join(", ")}</p>}
      {item.contents?.length > 0 && <details className="tray-contents"><summary>What’s in the platter</summary><ul>{item.contents.map((entry, index) => <li key={index}>{entry}</li>)}</ul></details>}
      {item.source_note && <p className="source-note">{item.source_note}</p>}
    </div>
    {priced ? <div className="menu-quantity" role="group" aria-label={item.name + " pickup quantity"}><button className="add-item decrease-item" onClick={() => changeItem(item, quantity - 1)} disabled={!quantity} aria-label={"Decrease " + item.name + " quantity"}><Minus size={18}/></button><span className="item-quantity" aria-label={item.name + " quantity"}>{quantity}</span><button className={quantity ? "add-item has-item" : "add-item"} onClick={() => changeItem(item, quantity + 1)} disabled={quantity >= 20} aria-label={"Add " + item.name + " to pickup plan"}><Plus size={18}/></button></div> : <a className="call-item" href={PHONE} aria-label={"Call about " + group.name}><Phone size={18}/></a>}
  </article>;
}
function SushiGuide() {
  const types = [
    ["Hosomaki", "A small, nori-wrapped roll, usually with one filling."],
    ["Futomaki", "A larger nori-wrapped roll with several fillings."],
    ["Uramaki & specialty rolls", "Inside-out rolls, with rice on the outside and nori within."],
    ["Temaki", "A cone-shaped hand roll filled with rice and other ingredients."],
    ["Nigiri", "A piece of fish or shellfish set on a small portion of seasoned rice."],
    ["Gunkan", "An oval of rice wrapped with nori to hold its topping."],
    ["Chirashi", "A bowl of sushi rice topped with fish, vegetables, and garnishes."],
    ["Naruto", "A cucumber-wrapped roll made without sushi rice."]
  ];
  return <section className="sushi-guide section-shell" id="sushi-guide" aria-labelledby="guide-title"><div className="guide-intro"><h2 id="guide-title">A little sushi<br/><em>know-how.</em></h2><p>Sushi starts with seasoned rice. It can include raw seafood, cooked ingredients, or vegetables; sashimi is the sliced seafood served without the rice. There’s a place to begin for every kind of appetite.</p><p>What began as a way of preserving fish evolved into the many styles enjoyed today. The restaurant’s guide celebrates that variety—from small nori-wrapped rolls to inside-out favorites.</p></div><dl className="sushi-types">{types.map(([name, description]) => <div key={name}><dt>{name}</dt><dd>{description}</dd></div>)}</dl></section>;
}

function PickupPlan({ open, close, items, plan, changeItem, backend }) {
  const dialog = useRef(null);
  const [quote, setQuote] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const validPlan = useMemo(() => Object.fromEntries(Object.entries(plan).filter(([id]) => items.some(item => item.id === id && Number.isInteger(item.price_cents)))), [plan, items]);
  const fallback = useMemo(() => localQuote(items, validPlan), [items, validPlan]);
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current.open) dialog.current.close();
  }, [open]);
  useEffect(() => {
    setQuote(null); setError("");
    if (!open || !backend || !fallback.lines.length) return;
    let cancelled = false;
    setBusy(true);
    api("quote", { method: "POST", body: { lines: fallback.lines.map(line => ({ item_id: line.item_id, quantity: line.quantity })) } })
      .then(result => { if (!cancelled) setQuote(result); })
      .catch(() => { if (!cancelled) setError("The live estimate is unavailable. Showing the posted-menu estimate instead."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [open, backend, fallback]);
  const result = quote || fallback;
  return <dialog ref={dialog} className="pickup-dialog" aria-labelledby="plan-title" onClose={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="pickup-content"><div className="dialog-heading"><div><ShoppingBag size={22}/><h2 id="plan-title">Your pickup plan</h2></div><button className="icon-button" onClick={close} aria-label="Close pickup plan"><X/></button></div><p className="dialog-intro">A little list for your next visit. Call us to confirm your order and pickup time.</p>
      {result.lines.length ? <><ul className="pickup-lines">{result.lines.map(line => { const item = items.find(item => item.id === line.item_id); return <li key={line.item_id}><div className="pickup-line-name"><h3>{line.name}</h3><span>{formatMoney(line.line_total_cents)}</span></div><p className="pickup-unit-price">{item?.rice_label && item.rice !== "none" ? item.rice_label + " · " : ""}{formatMoney(line.unit_price_cents)} each</p><div className="quantity-control"><button aria-label={"Remove one " + line.name} onClick={() => changeItem(item, line.quantity - 1)}><Minus size={15}/></button><span aria-label={line.name + " quantity"}>{line.quantity}</span><button aria-label={"Add one " + line.name} disabled={line.quantity >= 20} onClick={() => changeItem(item, line.quantity + 1)}><Plus size={15}/></button></div></li>; })}</ul><div className="pickup-summary"><span>Estimated subtotal</span><strong>{formatMoney(result.subtotal_cents)}</strong></div>{busy && <p className="small-status" role="status">Checking the menu estimate…</p>}{error && <p className="form-message" role="status">{error}</p>}<p className="estimate-note">Before tax. Prices and availability are confirmed by the restaurant. This plan does not place an order.</p><a className="button button-rust full-width" href={PHONE}>Call to arrange pickup <Phone size={17}/></a><button className="text-link drawer-continue" onClick={close}>Keep exploring <ArrowRight size={16}/></button></> : <div className="empty-plan"><ShoppingBag size={42}/><h3>Your next favorite is waiting.</h3><p>Add a favorite from the menu to start your pickup plan.</p><a className="button button-dark" href="#menu" onClick={close}>Explore the menu <ArrowRight size={16}/></a></div>}
    </div></dialog>;
}
function CateringForm({ backend }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [success, setSuccess] = useState(false);
  const requestKey = useRef(freshRequestKey());
  const today = new Date().toLocaleDateString("en-CA");
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(""); setSuccess(false);
    const form = event.currentTarget, data = new FormData(form);
    const payload = { name: data.get("name").trim(), email: data.get("email").trim(), guests: Number(data.get("guests")), event_date: data.get("event_date"), notes: data.get("notes").trim() };
    try {
      if (backend) {
        const result = await api("catering", { method: "POST", body: payload, key: requestKey.current });
        setMessage(result.message);
      } else {
        const record = { id: requestKey.current, ...payload, demo: true };
        sessionStorage.setItem("sushi-sei-catering-demo", JSON.stringify(record));
        setMessage("Saved in this browser’s demo only. Call 610.649.3193 to arrange real catering.");
      }
      setSuccess(true); requestKey.current = freshRequestKey(); form.reset();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <div className="catering-planner" id="catering-planner"><div className="planner-intro"><h3>Picture your gathering.</h3><p>Try the planning flow with sample details. This portfolio demo never sends an inquiry to the restaurant.</p></div><form onSubmit={submit} className="catering-form">
    <label>Your name<input name="name" required minLength="2" maxLength="80" autoComplete="off" placeholder="Demo Guest"/></label><label>Email address<input name="email" type="email" required maxLength="160" autoComplete="off" placeholder="demo@example.com"/></label><label>Event date<input name="event_date" type="date" required min={today}/></label><label>Number of guests<input name="guests" type="number" min="2" max="200" required placeholder="12"/></label><label className="form-wide">Anything you have in mind?<textarea name="notes" maxLength="1000" rows="3" placeholder="A mix of cooked and vegetarian favorites…"/></label><div className="form-wide form-bottom"><button className="button button-dark" disabled={busy} type="submit">{busy ? "Saving your demo…" : "Save demo inquiry"}{success ? <Check size={17}/> : <ArrowRight size={17}/>}</button><p role="status" className={success ? "form-message success-message" : "form-message"}>{message}</p></div>
    </form></div>;
}
createRoot(document.getElementById("root")).render(<App/>);
