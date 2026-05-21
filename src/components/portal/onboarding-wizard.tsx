"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: string;
  [key: string]: unknown;
}

interface Document {
  type: string;
  status: string;
  file_url?: string;
}

interface Preference {
  program_type: string;
  preference: string;
}

type StepType =
  | "text"
  | "textarea"
  | "select"
  | "date"
  | "multi-text"
  | "multi-checkbox"
  | "checkbox-with-text"
  | "programs";

interface Step {
  id: string;
  type: StepType;
  title: string;
  subtitle?: string;
  fields?: FieldDef[];
  options?: { value: string; label: string }[];
  field?: string;
  placeholder?: string;
  required?: boolean;
  programs?: Record<string, { name: string; desc: string }[]>;
}

interface FieldDef {
  field: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  half?: boolean;
  checkbox?: boolean;
  conditionalField?: string;
}

// ---------------------------------------------------------------------------
// Task definitions
// ---------------------------------------------------------------------------

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  icon: "user" | "briefcase" | "star" | "upload";
  type: "form" | "upload";
  docType?: string;
  docLabel?: string;
  steps?: Step[];
}

const NATIONALITY_OPTIONS = [
  { value: "German", label: "German" },
  { value: "American", label: "American" },
  { value: "Australian", label: "Australian" },
  { value: "British", label: "British" },
  { value: "Canadian", label: "Canadian" },
  { value: "Irish", label: "Irish" },
  { value: "New Zealander", label: "New Zealander" },
  { value: "South African", label: "South African" },
  { value: "Afghan", label: "Afghan" },
  { value: "Albanian", label: "Albanian" },
  { value: "Algerian", label: "Algerian" },
  { value: "Argentinian", label: "Argentinian" },
  { value: "Austrian", label: "Austrian" },
  { value: "Bangladeshi", label: "Bangladeshi" },
  { value: "Belgian", label: "Belgian" },
  { value: "Bolivian", label: "Bolivian" },
  { value: "Brazilian", label: "Brazilian" },
  { value: "Bulgarian", label: "Bulgarian" },
  { value: "Cameroonian", label: "Cameroonian" },
  { value: "Chilean", label: "Chilean" },
  { value: "Chinese", label: "Chinese" },
  { value: "Colombian", label: "Colombian" },
  { value: "Congolese", label: "Congolese" },
  { value: "Costa Rican", label: "Costa Rican" },
  { value: "Croatian", label: "Croatian" },
  { value: "Cuban", label: "Cuban" },
  { value: "Czech", label: "Czech" },
  { value: "Danish", label: "Danish" },
  { value: "Dominican", label: "Dominican" },
  { value: "Dutch", label: "Dutch" },
  { value: "Ecuadorian", label: "Ecuadorian" },
  { value: "Egyptian", label: "Egyptian" },
  { value: "Ethiopian", label: "Ethiopian" },
  { value: "Filipino", label: "Filipino" },
  { value: "Finnish", label: "Finnish" },
  { value: "French", label: "French" },
  { value: "Ghanaian", label: "Ghanaian" },
  { value: "Greek", label: "Greek" },
  { value: "Guatemalan", label: "Guatemalan" },
  { value: "Haitian", label: "Haitian" },
  { value: "Honduran", label: "Honduran" },
  { value: "Hungarian", label: "Hungarian" },
  { value: "Icelandic", label: "Icelandic" },
  { value: "Indian", label: "Indian" },
  { value: "Indonesian", label: "Indonesian" },
  { value: "Iranian", label: "Iranian" },
  { value: "Iraqi", label: "Iraqi" },
  { value: "Israeli", label: "Israeli" },
  { value: "Italian", label: "Italian" },
  { value: "Jamaican", label: "Jamaican" },
  { value: "Japanese", label: "Japanese" },
  { value: "Jordanian", label: "Jordanian" },
  { value: "Kenyan", label: "Kenyan" },
  { value: "Korean", label: "Korean" },
  { value: "Lebanese", label: "Lebanese" },
  { value: "Malaysian", label: "Malaysian" },
  { value: "Mexican", label: "Mexican" },
  { value: "Moroccan", label: "Moroccan" },
  { value: "Mozambican", label: "Mozambican" },
  { value: "Nepalese", label: "Nepalese" },
  { value: "Nicaraguan", label: "Nicaraguan" },
  { value: "Nigerian", label: "Nigerian" },
  { value: "Norwegian", label: "Norwegian" },
  { value: "Pakistani", label: "Pakistani" },
  { value: "Palestinian", label: "Palestinian" },
  { value: "Panamanian", label: "Panamanian" },
  { value: "Paraguayan", label: "Paraguayan" },
  { value: "Peruvian", label: "Peruvian" },
  { value: "Polish", label: "Polish" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Romanian", label: "Romanian" },
  { value: "Russian", label: "Russian" },
  { value: "Rwandan", label: "Rwandan" },
  { value: "Saudi", label: "Saudi" },
  { value: "Senegalese", label: "Senegalese" },
  { value: "Serbian", label: "Serbian" },
  { value: "Singaporean", label: "Singaporean" },
  { value: "Slovak", label: "Slovak" },
  { value: "Slovenian", label: "Slovenian" },
  { value: "Somali", label: "Somali" },
  { value: "Spanish", label: "Spanish" },
  { value: "Sri Lankan", label: "Sri Lankan" },
  { value: "Sudanese", label: "Sudanese" },
  { value: "Swedish", label: "Swedish" },
  { value: "Swiss", label: "Swiss" },
  { value: "Syrian", label: "Syrian" },
  { value: "Taiwanese", label: "Taiwanese" },
  { value: "Tanzanian", label: "Tanzanian" },
  { value: "Thai", label: "Thai" },
  { value: "Trinidadian", label: "Trinidadian" },
  { value: "Tunisian", label: "Tunisian" },
  { value: "Turkish", label: "Turkish" },
  { value: "Ugandan", label: "Ugandan" },
  { value: "Ukrainian", label: "Ukrainian" },
  { value: "Uruguayan", label: "Uruguayan" },
  { value: "Venezuelan", label: "Venezuelan" },
  { value: "Vietnamese", label: "Vietnamese" },
  { value: "Zimbabwean", label: "Zimbabwean" },
  { value: "Other", label: "Other" },
];

const ETHNICITY_OPTIONS = [
  { value: "white", label: "White" },
  { value: "black_african", label: "Black / African" },
  { value: "black_caribbean", label: "Black / Caribbean" },
  { value: "south_asian", label: "South Asian (Indian, Pakistani, Bangladeshi)" },
  { value: "east_asian", label: "East Asian (Chinese, Japanese, Korean)" },
  { value: "southeast_asian", label: "Southeast Asian (Filipino, Vietnamese, Thai)" },
  { value: "middle_eastern", label: "Middle Eastern / North African" },
  { value: "latino", label: "Latino / Hispanic" },
  { value: "indigenous", label: "Indigenous / First Nations" },
  { value: "mixed", label: "Mixed / Multiracial" },
  { value: "other", label: "Other" },
  { value: "rather_not_say", label: "Prefer not to say" },
];

const TASKS: OnboardingTask[] = [
  // --- Form 1: Personal Details & Qualifications ---
  {
    id: "personal",
    title: "Personal Details & Qualifications",
    description: "Contact info, identity, education, and teaching experience",
    icon: "user",
    type: "form",
    steps: [
      {
        id: "name",
        type: "multi-text",
        title: "What's your name?",
        fields: [
          { field: "first_name", label: "First name", placeholder: "First name", required: true, half: true },
          { field: "last_name", label: "Last name", placeholder: "Last name", required: true, half: true },
        ],
      },
      {
        id: "preferred_name",
        type: "text",
        title: "Do you have a preferred name or nickname?",
        subtitle: "This is how we'll address you day-to-day.",
        field: "preferred_name",
        placeholder: "e.g. Sam, Alex, etc.",
      },
      {
        id: "phone",
        type: "multi-text",
        title: "What's your phone number?",
        fields: [
          { field: "phone", label: "Phone number", placeholder: "+49...", required: true },
          { field: "phone_consent", label: "I consent to being contacted via WhatsApp / SMS", checkbox: true },
        ],
      },
      {
        id: "address",
        type: "multi-text",
        title: "What's your current address?",
        fields: [
          { field: "street", label: "Street & house number", placeholder: "e.g. Planufer 92B" },
          { field: "postal_code", label: "Postal code", placeholder: "e.g. 10967", half: true },
          { field: "city", label: "City", placeholder: "e.g. Berlin", half: true },
          { field: "country", label: "Country", placeholder: "Germany" },
        ],
      },
      {
        id: "dob",
        type: "date",
        title: "When's your birthday?",
        field: "date_of_birth",
      },
      {
        id: "nationality",
        type: "select",
        title: "What's your nationality?",
        field: "nationality",
        options: NATIONALITY_OPTIONS,
      },
      {
        id: "gender",
        type: "select",
        title: "What's your gender?",
        field: "gender",
        options: [
          { value: "female", label: "Female" },
          { value: "male", label: "Male" },
          { value: "non-binary", label: "Non-binary" },
          { value: "genderqueer", label: "Genderqueer" },
          { value: "agender", label: "Agender" },
          { value: "other", label: "Other" },
          { value: "rather_not_say", label: "Prefer not to say" },
        ],
      },
      {
        id: "pronouns",
        type: "select",
        title: "What are your pronouns?",
        field: "pronouns",
        options: [
          { value: "she/her", label: "She / Her" },
          { value: "he/him", label: "He / Him" },
          { value: "they/them", label: "They / Them" },
          { value: "she/they", label: "She / They" },
          { value: "he/they", label: "He / They" },
          { value: "ze/hir", label: "Ze / Hir" },
          { value: "other", label: "Other" },
          { value: "rather_not_say", label: "Prefer not to say" },
        ],
      },
      {
        id: "lgbtqia",
        type: "select",
        title: "Do you identify as LGBTQIA+?",
        subtitle: "Optional — helps us with diversity tracking.",
        field: "lgbtqia",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "rather_not_say", label: "Prefer not to say" },
        ],
      },
      {
        id: "ethnicity",
        type: "select",
        title: "What is your ethnicity?",
        subtitle: "Optional — helps us with diversity tracking.",
        field: "ethnicity",
        options: ETHNICITY_OPTIONS,
      },
      {
        id: "caretaker",
        type: "select",
        title: "Are you a caretaker?",
        subtitle: "Do you have caregiving responsibilities (e.g. children, elderly relatives)?",
        field: "caretaker_status",
        options: [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
          { value: "rather_not_say", label: "Prefer not to say" },
        ],
      },
      {
        id: "education_level",
        type: "select",
        title: "What's your highest level of education?",
        field: "education_level",
        options: [
          { value: "high_school", label: "High School / GED" },
          { value: "some_college", label: "Some College / University" },
          { value: "associate", label: "Associate Degree" },
          { value: "bachelors", label: "Bachelor's Degree" },
          { value: "masters", label: "Master's Degree" },
          { value: "doctorate", label: "Doctorate / PhD" },
          { value: "professional", label: "Professional Degree (JD, MD, etc.)" },
        ],
      },
      {
        id: "tefl",
        type: "select",
        title: "Do you have a TEFL / TESL / TESOL certification?",
        field: "tefl_status",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "in_progress", label: "Currently working on it" },
        ],
      },
      {
        id: "german",
        type: "multi-text",
        title: "How's your German?",
        fields: [
          {
            field: "german_level",
            label: "German Level (CEFR)",
            options: [
              { value: "none", label: "None" },
              { value: "A1", label: "A1 - Beginner" },
              { value: "A2", label: "A2 - Elementary" },
              { value: "B1", label: "B1 - Intermediate" },
              { value: "B2", label: "B2 - Upper Intermediate" },
              { value: "C1", label: "C1 - Advanced" },
              { value: "C2", label: "C2 - Proficient" },
            ],
          },
          { field: "german_professional", label: "I'm comfortable speaking German in a professional setting", checkbox: true },
        ],
      },
      {
        id: "art_profession",
        type: "text",
        title: "Are you a professional artist? If so, what kind?",
        subtitle: "Max 50 words.",
        field: "art_profession",
        placeholder: "e.g. Professional dancer, musician, actor...",
      },
      {
        id: "certifications",
        type: "textarea",
        title: "Any relevant degrees, certifications, or experiences?",
        subtitle: "List anything that supports your teaching — theatre degrees, workshop training, youth work experience, etc.",
        field: "certifications",
        placeholder: "BA in Theatre Arts, 3 years youth mentoring...",
      },
      {
        id: "teaching_exp",
        type: "multi-checkbox",
        title: "Which age groups have you taught?",
        subtitle: "Select all that apply.",
        fields: [
          { field: "exp_grades_1_4", label: "Grades 1-4 (ages 6-9)" },
          { field: "exp_grades_5_7", label: "Grades 5-7 (ages 10-12)" },
          { field: "exp_grades_8_plus", label: "Grades 8+ (ages 13+)" },
        ],
      },
      {
        id: "disabilities",
        type: "checkbox-with-text",
        title: "Do you have experience working with children with disabilities?",
        fields: [
          { field: "exp_disabilities", label: "Yes, I have experience", checkbox: true },
          { field: "exp_disability_description", label: "Tell us about your experience", placeholder: "Types of disabilities, settings, duration...", conditionalField: "exp_disabilities" },
        ],
      },
    ],
  },

  // --- Form 2: Payroll & Banking ---
  {
    id: "payroll",
    title: "Payroll & Banking",
    description: "Bank details and tax information for invoicing",
    icon: "briefcase",
    type: "form",
    steps: [
      {
        id: "bank",
        type: "multi-text",
        title: "Bank details for invoicing",
        subtitle: "This pre-populates your invoices. You can update it later.",
        fields: [
          { field: "iban", label: "IBAN", placeholder: "DE89 3704 0044 0532 0130 00", half: true },
          { field: "bank_name", label: "Bank name", placeholder: "e.g. N26, Sparkasse", half: true },
        ],
      },
      {
        id: "tax",
        type: "multi-text",
        title: "Tax information",
        fields: [
          { field: "tax_number", label: "Tax number (Steuernummer)", placeholder: "XX/XXX/XXXXX" },
          { field: "vat_registered", label: "I'm VAT registered (Umsatzsteuer)", checkbox: true },
          { field: "vat_number", label: "VAT Number (USt-IdNr)", placeholder: "DEXXXXXXXXX", conditionalField: "vat_registered" },
        ],
      },
      {
        id: "bahncard",
        type: "multi-text",
        title: "Do you have a BahnCard or Deutschlandticket?",
        fields: [
          {
            field: "bahncard",
            label: "BahnCard",
            options: [
              { value: "none", label: "None" },
              { value: "25", label: "BahnCard 25" },
              { value: "50", label: "BahnCard 50" },
              { value: "100", label: "BahnCard 100" },
            ],
          },
          { field: "bahncard_expiry", label: "BahnCard expiry date", type: "date" },
          { field: "deutschlandticket", label: "I have a Deutschlandticket subscription", checkbox: true },
        ],
      },
    ],
  },

  // --- Form 3: InterACT Programs & Logistics ---
  {
    id: "programs_logistics",
    title: "InterACT Programs & Logistics",
    description: "Learn about our programs, homestays, dietary needs, and transport",
    icon: "star",
    type: "form",
    steps: [
      {
        id: "homestay",
        type: "select",
        title: "Are you open to homestays?",
        subtitle: "Some of our class trips and camps take place outside Berlin. You'd stay with a local host family — meals and accommodation are provided. It's a great way to connect with the community!",
        field: "homestay_willing",
        options: [
          { value: "true", label: "Yes, I'm open to homestays" },
          { value: "false", label: "No, I'd prefer not to" },
        ],
      },
      {
        id: "dietary",
        type: "multi-checkbox",
        title: "Any dietary restrictions or allergies?",
        subtitle: "We need this for camps, class trips, and any catered events. Select all that apply.",
        fields: [
          { field: "_dietary_vegetarian", label: "Vegetarian" },
          { field: "_dietary_vegan", label: "Vegan" },
          { field: "_dietary_pescatarian", label: "Pescatarian" },
          { field: "_dietary_lactose", label: "Lactose intolerant" },
          { field: "_dietary_gluten", label: "Gluten intolerant" },
          { field: "_dietary_nut", label: "Nut allergy" },
          { field: "_dietary_shellfish", label: "Shellfish allergy" },
          { field: "_dietary_halal", label: "Halal" },
          { field: "_dietary_kosher", label: "Kosher" },
          { field: "_dietary_nopork", label: "No pork" },
        ],
      },
      {
        id: "certs_transport",
        type: "multi-text",
        title: "Certifications & transport",
        subtitle: "Some programs (especially camps near lakes) require a lifeguard cert. A driver's licence is handy for class trips outside Berlin.",
        fields: [
          {
            field: "lifeguard_cert",
            label: "Lifeguard certification?",
            options: [
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
              { value: "in_progress", label: "In progress" },
            ],
          },
          {
            field: "drivers_licence",
            label: "Driver's licence (valid in Germany)?",
            options: [
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
              { value: "in_progress", label: "In progress" },
            ],
          },
        ],
      },
      {
        id: "programs",
        type: "programs",
        title: "Which programs can you teach?",
        subtitle: "Here are the programs we run in schools. Tell us which ones you'd be comfortable leading — don't worry, you'll get training before your first project!",
        programs: {
          "Workshops & Weekly Programs": [
            { name: "Native Speaker Week", desc: "You'll spend a full week embedded in a school as a native English speaker role model. Each day you lead interactive, creative sessions — think games, storytelling, discussions, and group activities — all designed to get students excited about using English in real life. No textbooks, no grammar drills. Just authentic conversation and cultural exchange. You'll typically work with one or two classes across the week and build real connections with the students." },
            { name: "Theatre Week", desc: "Over five days, you guide a class from first read-through to final performance. Students write, rehearse, and perform a short play entirely in English. You'll direct, coach, and bring out the best in every student — from the confident performers to the shy ones finding their voice. The week ends with a live performance for the school. Theatre experience is a plus, but enthusiasm and the ability to lead a room are what matter most." },
            { name: "Art in Action Week", desc: "A week where visual arts and English come together. Students create artwork — painting, sculpture, collage, mixed media — while learning and practising English throughout the process. You'll facilitate creative workshops, guide discussions about art and culture, and help students present their work in English at the end of the week. Great for TAs with a background in visual arts or design." },
            { name: "Media Week", desc: "Students become journalists, podcasters, and content creators for the week. They produce real media — podcasts, video reports, blog posts, or social media content — all in English. You'll guide them through brainstorming, scripting, production, and editing. The final output is something they can actually share. You should be comfortable with basic media tools and enjoy working with technology." },
            { name: "Film Week", desc: "The class writes, shoots, and edits a short film in English over five days. You'll lead them through the full filmmaking process — from storyboarding and scriptwriting to directing, acting, and post-production. The week culminates in a screening for the school. Film or video production experience is helpful, but strong facilitation skills and creativity are key." },
            { name: "Kids Space Adventure", desc: "A space-themed English week designed for younger students in grades 1-4 (ages 6-9). Think rocket building, alien storytelling, planet exploration, and cosmic crafts — all in English. The week is high-energy, creative, and playful. You'll need to bring imagination and patience, as these are some of our youngest learners. If you love working with little kids and can make learning feel like an adventure, this one's for you." },
            { name: "Monster Parade", desc: "Another one for the younger students (grades 1-4). Over the week, kids design their own monsters — giving them names, backstories, and personalities — all in English. The week ends with a Monster Parade where they present their creations. It's creative, silly, and incredibly fun. You'll facilitate the craft sessions, help with storytelling, and keep the energy high." },
            { name: "Shakespeare Workshop", desc: "Designed for older students (grades 8+), this workshop brings Shakespeare to life through modern performance. Students explore a play — often Romeo & Juliet, A Midsummer Night's Dream, or Macbeth — and adapt scenes for contemporary audiences. You'll lead rehearsals, help students understand the language, and direct a final performance. Theatre background is strongly preferred." },
            { name: "Test Prep Workshop", desc: "A focused, practical workshop for students preparing for English language exams (Cambridge, IELTS, or school-leaving exams). You'll lead structured sessions covering speaking, listening, reading, and writing skills. Less creative than our other programs, but hugely valuable for the students. Best suited for TAs with TEFL experience or a strong background in English language teaching." },
            { name: "Job & Presentation Skills", desc: "Older students (grades 9+) learn practical English skills for the working world — writing CVs, preparing for job interviews, delivering presentations, and professional communication. You'll run mock interviews, coach presentations, and facilitate group exercises. This is one of our most impactful programs for students about to enter the job market. Real-world work experience is a huge asset here." },
            { name: "Global Speaker Week", desc: "Students explore global issues — climate change, migration, human rights, technology — and develop their public speaking skills in English. Each day focuses on a different topic with research, discussion, and debate. The week ends with student presentations to the school. You'll facilitate discussions, coach speaking skills, and help students form and articulate their opinions." },
            { name: "Debate Workshop", desc: "Students learn the art of structured debate in English. You'll teach them how to build arguments, use evidence, rebut opponents, and speak persuasively. The workshop format varies — sometimes a single intense day, sometimes spread across a week. The final session is a formal debate tournament. You should be comfortable facilitating fast-paced discussions and keeping energy levels high." },
          ],
          "Kulturtag (Culture Day)": [
            { name: "Kulturtag Theatre", desc: "A single action-packed day of theatre in a school. Students warm up, learn theatre techniques, rehearse scenes, and perform — all in English — within about 4-5 hours. It's intense but incredibly rewarding. You'll need to be confident leading a room, keeping energy high, and bringing a performance together quickly. These are typically booked by schools as a cultural enrichment day." },
            { name: "Kulturtag Dance", desc: "A one-day dance workshop combining movement, rhythm, and English language. Students learn choreography, explore different dance styles, and perform at the end of the day. You'll lead warm-ups, teach routines, and facilitate English communication throughout. Dance experience is essential — you should be comfortable teaching movement to beginners while keeping the focus on language." },
            { name: "Kulturtag Music", desc: "A single-day music workshop where students write lyrics, learn rhythms, and perform songs in English. You'll guide them through songwriting, basic music-making (often with percussion or body percussion), and a final performance. Musical ability is important — you should be able to lead a group musically while keeping the English language focus front and centre." },
            { name: "Kulturtag Art", desc: "A one-day visual arts workshop in English. Students create artwork around a theme — identity, culture, community — while practising their English throughout the process. The day ends with a gallery walk where students present their work in English. You'll facilitate the creative process, lead discussions, and help students articulate their ideas. Visual arts experience is a plus." },
          ],
          "Holiday Camps": [
            { name: "Camp General", desc: "Our flagship holiday camp format. Over 3-5 days during school holidays, students (usually ages 8-14) join an English-immersion camp packed with games, activities, workshops, and adventures. You'll lead group activities, facilitate English conversation, and create a fun, safe environment. Camps typically run full days (9am-4pm) and may include outdoor activities, sports, and creative workshops. High energy and strong group management skills are essential." },
            { name: "Camp Amazing Me", desc: "A self-expression and confidence-building camp in English. Over several days, students explore identity, creativity, and self-confidence through workshops on storytelling, art, movement, and performance. The camp culminates in each student sharing something about themselves — a performance, a piece of art, a story. You'll facilitate deeply personal creative work while keeping things fun and supportive." },
            { name: "Camp Media", desc: "A holiday camp focused on media production. Students create real content — short films, podcasts, photo essays, or social media campaigns — all in English. You'll teach basic production skills, guide creative direction, and help teams produce polished final pieces. The camp is hands-on and project-based. Comfort with media tools (cameras, editing software, audio recording) is important." },
            { name: "Camp Music & Songwriting", desc: "Campers write, compose, and record original songs in English over several days. You'll lead songwriting sessions, help with melody and lyrics, facilitate recording, and prepare for a final performance or listening party. Musical skills are essential — ideally you play an instrument or have production experience. The camp blends creative expression with English language practice." },
            { name: "Camp Nature & Climate", desc: "An outdoor camp combining nature exploration, environmental education, and English language. Activities include nature hikes, habitat studies, sustainability workshops, and creative projects — all conducted in English. Camps may take place in parks, forests, or rural settings outside Berlin. You should be comfortable outdoors, knowledgeable about environmental topics, and able to engage young people with nature." },
            { name: "Camp Theatre", desc: "An intensive multi-day theatre camp where students develop and perform a full production in English. From casting to costumes to opening night, you'll guide the entire process. The camp runs full days and demands high energy and strong direction. Theatre experience is strongly preferred. This is one of our most ambitious camp formats and produces incredible results." },
            { name: "Camp Dance", desc: "A dance-focused holiday camp combining choreography workshops, freestyle sessions, and English communication. Students learn routines across different styles, develop their own moves, and perform at the end of the camp. You'll lead classes, manage group dynamics, and keep the English flowing throughout. Strong dance ability and teaching experience are essential." },
          ],
          "Class Trips": [
            { name: "Class Trip Theatre", desc: "A multi-day class trip (typically 3-5 days) with a theatre focus. A school class travels to a location outside their city — often a youth hostel or retreat centre — and spends the trip creating and rehearsing a theatre production in English. You'll travel with them, stay in the accommodation (often a homestay), lead daily workshops, and direct the final performance. It's immersive, intensive, and deeply rewarding. Travel and overnight stays are part of the deal." },
            { name: "Class Trip English Team Building", desc: "An outdoor team-building class trip where everything happens in English. Students participate in group challenges, trust exercises, problem-solving activities, and adventure tasks — orienteering, raft building, cooking challenges — all facilitated in English. You'll lead the activities, manage group dynamics, and create an environment where students naturally use English. Outdoor experience and high energy are essential." },
            { name: "Class Trip Media", desc: "Students travel and create media content together — documentaries about the local area, vlogs, podcasts, or photo stories. You'll guide the production process from concept to final edit, all in English. Class trips are typically 3-5 days and involve overnight stays. You should be comfortable with media production tools and able to manage creative projects with teenagers." },
            { name: "Class Trip Music & Songwriting", desc: "A musical class trip where students write and perform original songs in English. Over several days, you'll lead songwriting workshops, facilitate band/group formation, and prepare for a final concert or recording session. The setting is usually a retreat centre or youth hostel. Musical skills and the ability to work with groups of varying ability levels are essential." },
            { name: "Class Trip Nature & Climate", desc: "An outdoor class trip focused on nature, sustainability, and English. Students explore natural habitats, conduct field studies, and engage with environmental topics — all in English. Trips are typically in rural settings and involve hiking, camping, or stays in eco-lodges. You should love the outdoors, have knowledge of environmental topics, and be comfortable leading groups in nature." },
            { name: "Class Trip Dance", desc: "A dance-focused class trip where students travel, learn choreography, develop their own pieces, and perform. You'll lead daily dance workshops across different styles, facilitate creative collaboration, and direct a final showcase. The trip typically lasts 3-5 days with overnight stays. Strong dance ability and experience teaching groups are essential." },
          ],
        },
      },
    ],
  },

  // --- Form 4: TA School Profile (fun stuff) ---
  {
    id: "school_profile",
    title: "TA School Profile",
    description: "The fun stuff! Build the profile that schools and kids will see",
    icon: "star",
    type: "form",
    steps: [
      {
        id: "where_from",
        type: "multi-text",
        title: "Where are you from?",
        fields: [
          { field: "hometown_city", label: "City / Town", placeholder: "e.g. Auckland", half: true },
          { field: "hometown_country", label: "Country", placeholder: "e.g. New Zealand", half: true },
        ],
      },
      {
        id: "moved_to_germany",
        type: "multi-text",
        title: "When did you move to Germany, and why?",
        fields: [
          {
            field: "moved_to_germany_year",
            label: "Year you moved",
            options: Array.from({ length: 40 }, (_, i) => {
              const y = String(new Date().getFullYear() - i);
              return { value: y, label: y };
            }),
          },
          { field: "moved_to_germany", label: "Why did you move?", placeholder: "Tell us your story..." },
        ],
      },
      {
        id: "likes_germany",
        type: "text",
        title: "What do you like about living in Germany?",
        field: "likes_germany",
        placeholder: "The bread? The trains? The bureaucracy?",
      },
      {
        id: "vacation_spot",
        type: "text",
        title: "Favourite place to go on vacation?",
        field: "vacation_spot",
        placeholder: "Dream destination...",
      },
      {
        id: "great_not_great",
        type: "multi-text",
        title: "Tell us about your strengths...",
        fields: [
          { field: "great_at", label: "Something you're great at", placeholder: "e.g. Making people laugh" },
          { field: "not_great_at", label: "Something you're not great at", placeholder: "e.g. Waking up early" },
        ],
      },
      {
        id: "art_type",
        type: "text",
        title: "What kind of art do you make or enjoy?",
        field: "art_type",
        placeholder: "Music, painting, dance, writing...",
      },
      {
        id: "superpower",
        type: "text",
        title: "If you could have any superpower, what would it be?",
        field: "superpower",
        placeholder: "Teleportation? Time travel?",
      },
      {
        id: "comic_title",
        type: "text",
        title: "What would the title of your comic book be?",
        field: "comic_title",
        placeholder: "The Adventures of...",
      },
      {
        id: "famous_last_words",
        type: "text",
        title: "Famous last words?",
        field: "famous_last_words",
        placeholder: "Something memorable...",
      },
      {
        id: "favourite_food",
        type: "text",
        title: "Favourite food?",
        field: "favourite_food",
        placeholder: "The one dish you could eat forever",
      },
      {
        id: "bio",
        type: "textarea",
        title: "Write a short bio (60-80 words)",
        subtitle: "This may appear on our website. Keep it fun and personal!",
        field: "bio",
        placeholder: "Hi, I'm... I love... I'm passionate about...",
      },
    ],
  },

  // --- Photo Upload ---
  {
    id: "photo_upload",
    title: "Profile Photo",
    description: "Upload a photo for your profile",
    icon: "upload",
    type: "upload",
    docType: "profile_photo",
    docLabel: "Profile Photo",
  },

  // --- Document Uploads ---
  {
    id: "doc_right_to_work",
    title: "Right to Work",
    description: "Upload your passport, visa, or work permit",
    icon: "upload",
    type: "upload",
    docType: "right_to_work",
    docLabel: "Passport / Visa / Work Permit",
  },
  {
    id: "doc_police_check",
    title: "Police Check",
    description: "Extended police check (erweitertes Fuhrungszeugnis)",
    icon: "upload",
    type: "upload",
    docType: "police_check",
    docLabel: "Extended Police Check",
  },
  {
    id: "doc_measles",
    title: "Measles Vaccination",
    description: "Proof of measles vaccination or immunity",
    icon: "upload",
    type: "upload",
    docType: "measles",
    docLabel: "Measles Vaccination Certificate",
  },
  {
    id: "doc_first_aid",
    title: "First Aid Certificate",
    description: "A valid first aid certificate",
    icon: "upload",
    type: "upload",
    docType: "first_aid",
    docLabel: "First Aid Certificate",
  },
];

// ---------------------------------------------------------------------------
// Main Component — Onboarding Dashboard
// ---------------------------------------------------------------------------

export function OnboardingWizard({
  profile: initialProfile,
  documents,
  preferences: initialPrefs,
  embedded = false,
  initialTask,
}: {
  profile: Profile;
  documents: Document[];
  preferences: Preference[];
  embedded?: boolean;
  initialTask?: string;
}) {
  const [activeTask, setActiveTask] = useState<string | null>(initialTask || null);
  const [data, setData] = useState<Record<string, unknown>>(() => {
    const d: Record<string, unknown> = {};
    for (const key of Object.keys(initialProfile)) {
      if (initialProfile[key] !== null && initialProfile[key] !== undefined) {
        d[key] = initialProfile[key];
      }
    }
    return d;
  });
  const [prefs, setPrefs] = useState<Record<string, string>>(() => {
    const p: Record<string, string> = {};
    for (const pref of initialPrefs) {
      p[pref.program_type] = pref.preference;
    }
    return p;
  });
  const [docs, setDocs] = useState<Map<string, Document>>(
    new Map(documents.map((d) => [d.type, d]))
  );
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => {
    const sections = (initialProfile.onboarding_sections_complete || {}) as Record<string, boolean>;
    return new Set(Object.entries(sections).filter(([, v]) => v).map(([k]) => k));
  });
  const router = useRouter();

  const totalTasks = TASKS.length;
  const isTaskComplete = (t: OnboardingTask) => {
    if (t.type === "upload") {
      if (t.docType === "profile_photo") return !!data.photo_url;
      const doc = docs.get(t.docType!);
      return doc && ["uploaded", "verified"].includes(doc.status);
    }
    return completedTasks.has(t.id);
  };
  const completedCount = TASKS.filter(isTaskComplete).length;
  const progress = Math.round((completedCount / totalTasks) * 100);
  const allDone = completedCount === totalTasks;

  async function markTaskComplete(taskId: string) {
    const updated = new Set(completedTasks);
    updated.add(taskId);
    setCompletedTasks(updated);

    const sections: Record<string, boolean> = {};
    updated.forEach((id) => (sections[id] = true));

    await fetch("/api/portal/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_sections_complete: sections }),
    });
  }

  async function handleFinishOnboarding() {
    await fetch("/api/portal/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_status: "ready" }),
    });
    router.push("/portal");
    router.refresh();
  }

  // If a task is active, show the form/upload flow
  if (activeTask) {
    const task = TASKS.find((t) => t.id === activeTask)!;
    if (task.type === "upload") {
      return (
        <UploadFlow
          task={task}
          profileId={initialProfile.id}
          embedded={embedded}
          doc={docs.get(task.docType!)}
          onUploaded={(doc) => {
            setDocs((prev) => {
              const next = new Map(prev);
              next.set(task.docType!, doc);
              return next;
            });
          }}
          onBack={() => {
            router.push("/portal");
            router.refresh();
          }}
        />
      );
    }
    return (
      <FormFlow
        task={task}
        data={data}
        prefs={prefs}
        setPrefs={setPrefs}
        embedded={embedded}
        onChange={(field, value) => setData((prev) => ({ ...prev, [field]: value }))}
        onComplete={() => {
          markTaskComplete(task.id);
          router.push("/portal");
          router.refresh();
        }}
        onBack={() => {
          router.push("/portal");
          router.refresh();
        }}
      />
    );
  }

  // No active task — redirect to portal dashboard
  return null;
}

// ---------------------------------------------------------------------------
// Task Icons
// ---------------------------------------------------------------------------

function TaskIcon({ type }: { type: string }) {
  switch (type) {
    case "user":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
        </svg>
      );
    case "briefcase":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      );
    case "star":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      );
    case "upload":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Form Flow (Typeform-style within a task)
// ---------------------------------------------------------------------------

function FormFlow({
  task,
  data,
  prefs,
  setPrefs,
  embedded = false,
  onChange,
  onComplete,
  onBack,
}: {
  task: OnboardingTask;
  data: Record<string, unknown>;
  prefs: Record<string, string>;
  setPrefs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  embedded?: boolean;
  onChange: (field: string, value: unknown) => void;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const containerRef = useRef<HTMLDivElement>(null);
  const steps = task.steps!;
  const step = steps[current];
  const isLast = current === steps.length - 1;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey && step.type !== "textarea" && step.type !== "programs") {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, data]);

  async function saveStep() {
    setSaving(true);
    const stepData: Record<string, unknown> = {};

    if (step.type === "programs") {
      await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program_preferences: prefs }),
      });
      setSaving(false);
      return;
    }

    if (step.field) {
      let val = data[step.field];
      if (val === "true") val = true;
      if (val === "false") val = false;
      stepData[step.field] = val ?? null;
    }
    if (step.fields) {
      for (const f of step.fields) {
        stepData[f.field] = data[f.field] ?? null;
      }
    }
    if (Object.keys(stepData).length > 0) {
      await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepData),
      });
    }
    setSaving(false);
  }

  async function goNext() {
    await saveStep();
    if (isLast) {
      onComplete();
      return;
    }
    setDirection("forward");
    setCurrent((c) => c + 1);
    containerRef.current?.scrollTo({ top: 0 });
  }

  function goBack() {
    if (current === 0) {
      onBack();
      return;
    }
    setDirection("back");
    setCurrent((c) => c - 1);
    containerRef.current?.scrollTo({ top: 0 });
  }

  return (
    <div className={`flex flex-col ${embedded ? "min-h-full" : "fixed inset-0 bg-white dark:bg-zinc-950"}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3 dark:border-zinc-900">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to tasks
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{task.title}</span>
          {saving && <span className="text-xs text-zinc-400">Saving...</span>}
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 py-2">
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < current ? "bg-green-500" : i === current ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-100 dark:bg-zinc-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div
          key={current}
          className={`mx-auto flex min-h-full max-w-2xl flex-col justify-center px-6 py-12 ${
            direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
          }`}
        >
          {step.type === "text" && (
            <TextStep step={step} value={(data[step.field!] as string) || ""} onChange={(v) => onChange(step.field!, v)} />
          )}
          {step.type === "textarea" && (
            <TextAreaStep step={step} value={(data[step.field!] as string) || ""} onChange={(v) => onChange(step.field!, v)} />
          )}
          {step.type === "date" && (
            <DateStep step={step} value={(data[step.field!] as string) || ""} onChange={(v) => onChange(step.field!, v)} />
          )}
          {step.type === "select" && (
            <SelectStep step={step} value={(data[step.field!] as string) || ""} onChange={(v) => { onChange(step.field!, v); setTimeout(goNext, 300); }} />
          )}
          {step.type === "multi-text" && (
            <MultiTextStep step={step} data={data} onChange={onChange} />
          )}
          {step.type === "multi-checkbox" && (
            <MultiCheckboxStep step={step} data={data} onChange={onChange} />
          )}
          {step.type === "checkbox-with-text" && (
            <CheckboxWithTextStep step={step} data={data} onChange={onChange} />
          )}
          {step.type === "programs" && (
            <ProgramsStep step={step} prefs={prefs} setPrefs={setPrefs} />
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4 dark:border-zinc-900">
        <button
          onClick={goBack}
          className="flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700 dark:hover:bg-zinc-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-3">
          {step.type !== "select" && (
            <span className="hidden text-xs text-zinc-400 sm:block">
              Press <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-zinc-800">Enter</kbd>
            </span>
          )}
          <button
            onClick={goNext}
            className="flex items-center gap-1 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isLast ? "Complete" : "Continue"}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload Flow
// ---------------------------------------------------------------------------

function UploadFlow({
  task,
  profileId,
  embedded = false,
  doc,
  onUploaded,
  onBack,
}: {
  task: OnboardingTask;
  profileId: string;
  embedded?: boolean;
  doc?: Document;
  onUploaded: (doc: Document) => void;
  onBack: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploaded = doc && ["uploaded", "verified"].includes(doc.status);

  const isPhoto = task.docType === "profile_photo";

  async function handleFile(file: File) {
    setUploading(true);
    const supabase = createClient();
    const folder = isPhoto ? "photos" : "documents";
    const fileName = `${folder}/${profileId}/${task.docType}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("documents")
      .upload(fileName, file);

    if (error) {
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(data.path);

    if (isPhoto) {
      // Save photo URL to profile
      await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_url: urlData.publicUrl, school_photo_url: urlData.publicUrl }),
      });
    } else {
      await fetch("/api/portal/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: task.docType,
          file_url: urlData.publicUrl,
        }),
      });
    }

    onUploaded({ type: task.docType!, status: "uploaded", file_url: urlData.publicUrl });
    setUploading(false);
  }

  return (
    <div className={`flex flex-col ${embedded ? "min-h-full" : "fixed inset-0 bg-white dark:bg-zinc-950"}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3 dark:border-zinc-900">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to tasks
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            {task.title}
          </h1>
          <p className="mt-3 text-lg text-zinc-500">{task.description}</p>

          <div className="mt-8">
            {uploaded ? (
              <div className="rounded-xl border-2 border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-900/20">
                {isPhoto && doc?.file_url ? (
                  <img src={doc.file_url} alt="" className="mx-auto h-24 w-24 rounded-full object-cover border-4 border-green-200" />
                ) : (
                  <svg className="mx-auto h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <p className="mt-3 text-lg font-medium text-green-700 dark:text-green-400">
                  {task.docLabel} uploaded
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-sm text-green-600 underline hover:text-green-700"
                >
                  Replace file
                </button>
                <div className="mt-6">
                  <button
                    onClick={onBack}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Done
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-all ${
                  dragOver
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                    : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700"
                }`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
                    <p className="mt-4 text-zinc-500">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">
                      Drop your file here or click to browse
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">{isPhoto ? "JPG or PNG up to 5MB" : "PDF, JPG, or PNG up to 10MB"}</p>
                  </>
                )}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={isPhoto ? ".jpg,.jpeg,.png" : ".pdf,.jpg,.jpeg,.png"}
            className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step renderers (same as before)
// ---------------------------------------------------------------------------

function StepHeader({ step }: { step: Step }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
        {step.title}
      </h1>
      {step.subtitle && (
        <p className="mt-3 text-lg text-zinc-500 dark:text-zinc-400">{step.subtitle}</p>
      )}
    </div>
  );
}

function TextStep({ step, value, onChange }: { step: Step; value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div>
      <StepHeader step={step} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={step.placeholder}
        className="w-full border-0 border-b-2 border-zinc-200 bg-transparent py-3 text-2xl text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-900 focus:outline-none focus:ring-0 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-100"
      />
    </div>
  );
}

function TextAreaStep({ step, value, onChange }: { step: Step; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div>
      <StepHeader step={step} />
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={step.placeholder}
        rows={4}
        className="w-full resize-none border-0 border-b-2 border-zinc-200 bg-transparent py-3 text-xl text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-900 focus:outline-none focus:ring-0 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-100"
      />
    </div>
  );
}

function DateStep({ step, value, onChange }: { step: Step; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <StepHeader step={step} />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-0 border-b-2 border-zinc-200 bg-transparent py-3 text-2xl text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-0 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-zinc-100"
      />
    </div>
  );
}

function SelectStep({ step, value, onChange }: { step: Step; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <StepHeader step={step} />
      <div className="space-y-2">
        {step.options!.map((opt, i) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex w-full items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-all ${
              value === opt.value
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
              value === opt.value
                ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}>
              {String.fromCharCode(65 + i)}
            </span>
            <span className="text-lg">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiTextStep({ step, data, onChange }: { step: Step; data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  return (
    <div>
      <StepHeader step={step} />
      <div className="space-y-5">
        {step.fields!.map((f) => {
          if (f.checkbox) {
            return (
              <label key={f.field} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!data[f.field]} onChange={(e) => onChange(f.field, e.target.checked)}
                  className="h-5 w-5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600" />
                <span className="text-lg text-zinc-700 dark:text-zinc-300">{f.label}</span>
              </label>
            );
          }
          if (f.options) {
            return (
              <div key={f.field}>
                <label className="mb-1.5 block text-sm font-medium text-zinc-500">{f.label}</label>
                <select value={(data[f.field] as string) || ""} onChange={(e) => onChange(f.field, e.target.value)}
                  className="w-full border-0 border-b-2 border-zinc-200 bg-transparent py-3 text-xl text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-0 dark:border-zinc-700 dark:text-zinc-50 dark:focus:border-zinc-100">
                  <option value="">Select...</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            );
          }
          if (f.conditionalField && !data[f.conditionalField]) return null;
          return (
            <div key={f.field} className={f.half ? "inline-block w-[calc(50%-0.5rem)] first:mr-4" : ""}>
              <label className="mb-1.5 block text-sm font-medium text-zinc-500">{f.label}</label>
              <input type={f.type || "text"} value={(data[f.field] as string) || ""} onChange={(e) => onChange(f.field, e.target.value)}
                placeholder={f.placeholder}
                className="w-full border-0 border-b-2 border-zinc-200 bg-transparent py-3 text-xl text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-900 focus:outline-none focus:ring-0 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-100" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MultiCheckboxStep({ step, data, onChange }: { step: Step; data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  return (
    <div>
      <StepHeader step={step} />
      <div className="space-y-3">
        {step.fields!.map((f) => (
          <label key={f.field}
            className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 px-5 py-4 transition-all ${
              data[f.field] ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900" : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700"
            }`}>
            <input type="checkbox" checked={!!data[f.field]} onChange={(e) => onChange(f.field, e.target.checked)}
              className="h-5 w-5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600" />
            <span className="text-lg text-zinc-700 dark:text-zinc-300">{f.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CheckboxWithTextStep({ step, data, onChange }: { step: Step; data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  return (
    <div>
      <StepHeader step={step} />
      <div className="space-y-5">
        {step.fields!.map((f) => {
          if (f.checkbox) {
            return (
              <label key={f.field}
                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 px-5 py-4 transition-all ${
                  data[f.field] ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900" : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700"
                }`}>
                <input type="checkbox" checked={!!data[f.field]} onChange={(e) => onChange(f.field, e.target.checked)}
                  className="h-5 w-5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600" />
                <span className="text-lg text-zinc-700 dark:text-zinc-300">{f.label}</span>
              </label>
            );
          }
          if (f.conditionalField && !data[f.conditionalField]) return null;
          return (
            <div key={f.field}>
              <label className="mb-1.5 block text-sm font-medium text-zinc-500">{f.label}</label>
              <textarea value={(data[f.field] as string) || ""} onChange={(e) => onChange(f.field, e.target.value)}
                placeholder={f.placeholder} rows={3}
                className="w-full resize-none border-0 border-b-2 border-zinc-200 bg-transparent py-3 text-lg text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-900 focus:outline-none focus:ring-0 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-100" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgramsStep({ step, prefs, setPrefs }: { step: Step; prefs: Record<string, string>; setPrefs: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  // Flatten all programs into a single list for paging
  const allPrograms: { name: string; desc: string; group: string }[] = [];
  for (const [group, items] of Object.entries(step.programs!)) {
    for (const prog of items) {
      allPrograms.push({ ...prog, group });
    }
  }

  const [idx, setIdx] = useState(0);
  const prog = allPrograms[idx];
  const currentPref = prefs[prog.name] || "";
  const answeredCount = allPrograms.filter((p) => prefs[p.name]).length;

  const handleSelect = (opt: string) => {
    setPrefs((p) => ({ ...p, [prog.name]: p[prog.name] === opt ? "" : opt }));
    // Auto-advance after short delay
    if (idx < allPrograms.length - 1) {
      setTimeout(() => setIdx((i) => i + 1), 400);
    }
  };

  // Category colors
  const groupColors: Record<string, string> = {
    "Workshops & Weekly Programs": "bg-blue-500",
    "Kulturtag (Culture Day)": "bg-purple-500",
    "Holiday Camps": "bg-green-500",
    "Class Trips": "bg-amber-500",
  };

  return (
    <div className="-mx-6 -my-12">
      {/* Progress */}
      <div className="flex items-center justify-between px-6 py-3">
        <span className="text-xs text-zinc-400">{idx + 1} of {allPrograms.length} programs</span>
        <span className="text-xs text-zinc-400">{answeredCount} answered</span>
      </div>
      <div className="flex gap-0.5 px-6 mb-6">
        {allPrograms.map((p, i) => (
          <div
            key={p.name}
            className={`h-1 flex-1 rounded-full cursor-pointer transition-all ${
              i === idx ? "bg-zinc-900 dark:bg-zinc-100" :
              prefs[p.name] ? "bg-green-400" : "bg-zinc-200 dark:bg-zinc-800"
            }`}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>

      {/* Two-column layout */}
      <div key={idx} className="grid grid-cols-1 gap-8 px-6 lg:grid-cols-2 animate-slide-in-right">
        {/* Left — description */}
        <div className="flex flex-col justify-center">
          <div className="mb-4 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${groupColors[prog.group] || "bg-zinc-400"}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{prog.group}</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {prog.name}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
            {prog.desc}
          </p>
          {/* Placeholder for future image/video */}
          <div className="mt-6 flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" />
              </svg>
              <p className="mt-1 text-xs text-zinc-400">Image or video coming soon</p>
            </div>
          </div>
        </div>

        {/* Right — answer */}
        <div className="flex flex-col justify-center">
          <p className="mb-5 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Can you lead this program?
          </p>
          <div className="space-y-3">
            {([
              { value: "pro", label: "Pro", sublabel: "I've done this before and I'm confident", color: "green" },
              { value: "yes", label: "Can do", sublabel: "I'm willing and able to learn", color: "blue" },
              { value: "no", label: "Not for me", sublabel: "Not interested or not suitable", color: "zinc" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 px-6 py-5 text-left transition-all ${
                  currentPref === opt.value
                    ? opt.color === "green"
                      ? "border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/20"
                      : opt.color === "blue"
                        ? "border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20"
                        : "border-zinc-500 bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-800"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  currentPref === opt.value
                    ? opt.color === "green"
                      ? "bg-green-500 text-white"
                      : opt.color === "blue"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-500 text-white"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                }`}>
                  {opt.value === "pro" && (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  )}
                  {opt.value === "yes" && (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                  {opt.value === "no" && (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-base font-semibold ${
                    currentPref === opt.value ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300"
                  }`}>
                    {opt.label}
                  </p>
                  <p className="text-sm text-zinc-500">{opt.sublabel}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Nav */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setIdx(Math.max(0, idx - 1))}
              disabled={idx === 0}
              className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Previous
            </button>
            <button
              onClick={() => setIdx(Math.min(allPrograms.length - 1, idx + 1))}
              disabled={idx === allPrograms.length - 1}
              className="flex items-center gap-1 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Next
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
