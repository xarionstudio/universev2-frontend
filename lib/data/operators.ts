/* Operator lapangan + alokasi harian — DIGENERATE dari
   docs/setting-operator.xlsx (sheet tanggal 1). JANGAN edit manual —
   jalankan: python3 docs/generate-operators.py

   Kenapa ada berkas ini: master karyawan tulis-tangan di employees.ts berisi
   21 persona desain — cukup untuk halaman Attendance, Fit To Work, dan
   Prestasi (ketiganya punya seed sendiri), tapi tidak cukup untuk MENGISI
   formasi fleet. Akibatnya layar TV fleet menampilkan "Belum ada operator" di
   hampir semua kartu, yang terbaca sebagai layar rusak, bukan sebagai data
   kosong. Nama & NIK di sini nyata dari file setting operator, jadi layar
   memantulkan penugasan yang sebenarnya, bukan tebakan greedy.

   Field selain NIK & NAMA (departemen, mess, kontak, dst.) TIDAK ada di file
   sumber; nilainya deterministik dari NIK, sama seperti lokasi & status dummy
   pada units-db.ts. Kompetensi TIDAK di-hardcode — diturunkan dari unit yang
   benar-benar dioperasikan lewat typeOfEgi(), agar tidak pernah berbeda dengan
   aturan di modul lain. */

import type { Employee, Komp } from "./employees";
import { typeOfEgi, unitsDb } from "./units-db";

/* nik|nama */
const rawOps = `50123600|Nursyaifullah
50123611|Dwi Hamdani
501241710|Julpiansyah
501241730|Muh. Ja'Far
501241731|Aris Mau Umar
501241734|Shandy Chaidir
501241748|Herianto Tangnga
501241751|Pebrianto
501241752|Aldi Pratama
501241753|Aris Ruminto
501241758|Nopriyanto La'Bi Padidi
501241775|Ruben Lottong
501241780|Hardianto
501241782|Efraim Palangda
501241784|Purwito
501241785|Koko Nyepiantoro
501252936|Lucy Kende Tonapa
501252937|Eva Meithy
501252938|Erma Nurrohmah
501252939|Usman Pata'Dungan
501252940|Abdul Wahab
501253016|Sutrisno Mokoagow
501253017|Joko Suwito
501263966|Susan Parabak
501263983|Nurman Bagus Kurniawan
50222222|David Pakiding
50223626|Nuryanto
50223643|Agus Budianto
50223648|Bahar
50223651|Andi Jumaidi Frangky
50223661|Bayu Hendra Prasetia
50223665|Yunus
502241805|Suardi Nurdin
502241811|Jhon Marsup Uttung
502241825|Astomo Supriyanto
502241828|Darma Palulun
502241831|Muhammad Ilham
502241832|Alvian
502241833|Marthinus Anggi
502241836|Ismail.
502241849|Joni Yunus
502241854|Yusuf.
502241861|Samuel
502241862|Frederik Kottong
502241864|Karel Borean
502241868|Junawir Tarsan
502241880|Roni Fahri
502241891|Obet Nego Patpangan
502241912|David Ferdinand Sianturi
502253043|Rudiyanto
502253053|Ro'Iful Anam
502253054|Redho Sumartono
502253055|Muhammad Hadri
502253057|Andi Muhammad Irvansyah
502264017|Hendra Gunawan Lumban Gaol
502264029|Andrean Saputra
502264037|Andi Suryanto
502264038|Jahruddin
502264039|Khoirul Anwar
502264043|Aswar Hasan
502264044|M. Reza Rananda
502264045|Alfian Ceri Ransun
502264052|Rahmansyah
502264071|Dede Herdiana
502264075|Heru Istiwoko
502264082|Riski Dwi Prasetiyo
502264103|Hendra Wijaya
502264106|Pudji Adhyatma Tagar
502264107|Sutikno
50322247|Marpa Daun La'Bi
50323701|Aswar Nasir
50323715|Perdi Salu
50323723|Ardiansyah
50323730|Yudha Prayoga Rosian
50323736|Iskandar
50323761|Ardisan
50323777|Mateus Beda
503241966|Yaser Gala
503241968|Nanda Arya Saputra
503241971|Markus Pangala
503241972|Kristoforus Ariyanto
503242001|Nuril Masrokim
503242005|Feri Matika
503242034|Tandi
503242045|Saing
503264119|Elisabet Saltika
503264120|Nur Patimah
503264164|Syahrijal
503264178|Jumay
50423790|Misba
50423799|Musyafir
50423825|Said Marzuki
50423849|Helda Adi Nata
50423857|Muh Arfah
50423864|Wahyu Sodik
50423869|Atanasius Sipri
50423885|Ronal Palangiran
50423895|Kurdianto
50423896|Sugeng Riyadi
50423904|Redik Manjara
50423913|Sudarmono
50423914|M. Rafika Dedi
50423916|Said Safuan
504242064|Arnoldus Marak Lewar
504242066|Imam Muchdi
504242127|Aser Palungan
504253161|Muhammad Najeri
504253164|Agustinus Putra Warsono
504253165|Dody Candra Ariwibowo
504253172|Taufik Hidayat.
504253178|Ahmad Basori
504264195|Muhamad Jumaidil
504264196|Alfian Chandra
504264197|Yoga Adithama Malau
504264198|Silvianus Senido
504264199|Asmadi
504264200|Hendrik Mamele
504264247|Agustinus Paerunan
504264269|Khoirul Anwar.
50523938|Paulus Pedi Pasampe
50523947|Jamaludin
50523958|Wardiman Jaya
505242184|Hendra Ibrahim
505242194|Lemson Silalahi
505242201|Aswanda Rizky Prastya
505253226|Zainal
505253269|Fredi Kutu'
505253271|Anggoro Seto
505253272|Dodi Alfayed
505253274|Gibson Setiawan
505253281|Syamsuri
505253285|Harisman Abbas
505253286|Okrista Primadana
505264277|Ady Tian Cristy
505264304|Altrianus
505264305|Supriyadi
505264306|Stepen
505264319|Jeffry Arviandi
50622310|Suwaldi
506231005|Marsuki
506231017|Azizul
506231028|Simon Tandi Lembang
506231032|Agus Setiawan
506231036|Yohanis Pata' Rante Salu
506231048|Arifin
50623986|Andi Lalla
506242259|Reski Rante Patanduk
506242263|Frans Mangopang
506242264|Yoga Krisma Saputra
506242272|Firman Wahyudi
506242273|Mikael
506242275|Arbain
506242279|Agusman
506242282|Kristo
506242283|Kornelius Ayub
506242286|Frans Layuk Pasereng
506253305|Yorisius Geradus Mayela Gagi
506253331|Syarifuddin Saleng
506253346|Asril Gunawan Suryadi
506253348|Gede Heru Setiadi
506253353|Yohanes Novensius Wangge
506253368|Putro Bayu Widiantoro
506253369|Syamsul Rizal
506253370|Ashadi
506253371|Rahmat Aksan
506253378|Muhammad Rafli
506253380|Fathurrahman
50721060|Andi Amiluddin
50721063|Murdani
50721064|Sahroni
50721065|Ali Usman
50722333|Rudi Hamzah
507231051|Iskandar Potabuga
507231053|Shuty
507231072|Risal
507231074|Maman
507231076|Opan Hamdi
507231100|Jhoni Tanga
507231105|Dedy Tandipuang
507231106|Sugeng Juantoro
507242305|Samsul Nurdin
507242315|Budi Hartono
507242317|Hasril
507242318|Agus Sudarsono
507242321|Yunus Mintin
507242322|Ikhtiar
507242325|Zulkifli Sutarman
507242326|Ardi Pappang
507242333|Firdaus
507242334|Hendra Arifandi
507242335|Willy
507242342|Murdani.
507242343|Aris Susawan
507242355|Rusmin
507242371|Muhammad Habibul Umam
507242377|Idwanto
507242393|Jhon Tandi Russun
507242399|Bima Praswidya Putra
507242409|Onesimus Balalembang
507253393|Burhan Tang
507253394|Abdul Rahman Nurdin
507253398|Beni Febriko Hutagaol
507253399|Arnold Rombe
507253400|Safri
507253409|Harianto
507253411|Muhammad Nasri
507253414|Ferdianto Paretta
50822375|Sugeng Hariadi
50822388|Yosep Rani Rante Salu
50822392|Harimantu Yanuari Ramadhan
50822396|Sugito
50822399|Paulus Muda
508231108|Makinudin
508231115|Kiki Prasetyo
508231132|Fransiskus Sari
508231136|Henri Widiyono
508231151|Herman Andi
508231161|Mochamad Soleh
508231185|Sudiyono
508231194|Dhuwi Ade Ramadhan
508231206|Suhandayu Novianto
508231207|Supari
508231218|Daddy Octavianus
508231242|Husainy
508242416|Imam Murdoni
508242428|Deni Delvila
508242444|M. Ramli
508242476|Sutrisno.
508242512|Yulius Rante
508242513|M. Akbar Nur Aksan
508242514|Anton Paguling
508242531|Hengki Trianggono
508253483|Nasrul
508253488|Hendra Ferdian Kurniawan
508253489|Muhctar
508253490|Yohanes L.O.S
508253492|Noval Almahdi
508253496|Aprianto Rante Toding
508253569|Sudarman
508253570|Ahmad Rifai.
508253571|Agus
508253574|Shirjon Tulak
508253583|Agus Singgi Masiku
509231282|Qais Al-Karny
509231293|David Julfiandi Sinambela
509231340|Adi Saputra
509231375|Mardy Tangke
509242555|Muhammad Syafi'I
509242557|Supirman
509242558|Wahid Saeful Amri
509242570|Juliani
509242584|Hartina
509242586|Martina Kewa
509242587|Adhany Dewi Suardy
509242592|Hasmawati Ismail
509242593|Aryadi Susanto
509253598|Abdul Bahid
509253599|Irwan..
509253600|Markus Lau
509253601|Agus Candra
509253602|Aprianus Pakiding
509253609|Adi Hartono
509253610|Yakob Bokko' Kendek
509253611|Sulaiman
509253612|Faizal Amir
509253614|Paulus Fandry Nggaji
509253615|Paulus Apandi
509253616|Heribertus Rendo
509253621|Kommarudin
509253624|Kahar.
509253645|Muhammar Rizwan Fadhillah
509253651|Edi Patandung
509253652|Rahmat Waluyo
509253662|Jumardin.
51022426|Hartono Limbong M
51022443|Agus Novaruddin
51022448|Fitriadi
510231424|Agus S
510231426|Janairo Lase
510231454|Pradana Putra
510231462|Riswanto
510242621|Irfan.
510242633|Alex Sampe
510242646|Agus Khaerudin
510242647|Patrisius
510242650|Arfan
510242654|Aswandhy Salhuddin
510242656|Jupri Tandililing
510242657|Zulkarnaim Ilham
510242658|Hilarius Nuruk
510242663|Saharuddin
510242668|Muhammad Iswahyudi
510242671|Jusliadi
510242674|Yohan Rifandi
510242682|Kamal B Kamaruddin
510242684|Herson Pasang
510242695|Ibrahim Mentaruk Ratte
510242697|Sefmi Elo
510242699|Eko Susilo
510242700|Irwan
510242702|Royan Roberto Awan
510242704|Husem
510242716|Tris Sejahtera
510253672|Riko Saputra
510253697|Jumadil.
510253698|Hendry
510253699|Toni Saputra
510253700|Tappi'
51122450|Titus Panggau
51122456|Eko Purnomo
51122466|Muhammad Mukhsan
51122468|Matius Kiki
51122472|Sappewali
51122485|Sunawar
511231481|Muhammad Nasir
511231489|Nelseser Somalinggi
511231515|Haris Kurnia
511231521|Ansar
511231525|Yohanes More
511231526|Herman
511231531|Yusuf Palinggi
511231532|Melky Reinaldy Palinoan
511231550|Nur Said
511231551|Muji Argo Ernanto
511231552|Yatiman
511231554|Gusti Mappiranda
511231555|Agus Juanto
511231561|Perianto Raba
511231566|Mardiansyah
511231570|Karianto
511231574|Rais
511231594|Muh. Darwan .S
511253815|Muhrizal
511253816|Misrani
511253817|Rahmat Hidayat
51222500|Adi Putra Siswanto
51222501|Gusman
51222526|Nurhadi Fahrudin
51222532|Hendrik
51222535|Rizal
51222536|Wilhelmus Mego
51222554|Jefri Tangdi Kapang
512231663|Muhammad Ali
512231664|Novi Andani
512231666|Agus Wijayanto
512242854|Marsen Panggeso
512242865|Togap Sofyan Efendi Silitonga
512242888|Kirenius Kidal
512242891|Rudi
512242897|Triyono
512242925|Agus Salim.
512253854|David Rikardo Saragih
512253856|Hendri Darundio
512253861|Muhammad Alfa Putra Ananda
512253862|Muhamad Reza
512253863|Supriadi.
512253864|Bartolomeus Bannepadang
512253865|Gibson Sampe Litak Danduru
512253866|Raihan Rae
512253870|Syafruddin
512253885|Ferminus Meldi Andi
512253890|Misbahul Munir
512253892|Andi Muis
512253896|Migellino Rachmad`;

/* unit|nikPagi|nikMalam ("" = tidak ada penugasan di shift itu) */
const rawAlloc = `DT4017|502241912|504264195
DT4018|509253621|505242201
DT4019||509253624
DT4020|508253496|507242305
DT4022|510242695|501263983
DT4024|506253305|510242650
DT4025|509253611|512253890
DT4026|507242371|512253862
DT4027|504264200|505253286
DT4029|502253053|502264082
DT4030|510242674|508242428
DT4032|508242444|502264039
DT4034|510242646|510242697
DT4035|510242671|502264037
DT4036|510242668|512253861
DT4037|506231028|502253057
DT4038|507253400|507253399
DT4039|509253610|510242658
DT4040|502253054|510242633
DT4041|509231293|510242654
DT4042|509242593|502264038
DT4043|502253055|510242621
DT4044|509253609|509231340
DT4045|509253602|504253172
DT4046|509253601|510242656
DT4047|509253600|502264017
DT4048|507253414|510242684
DT4049|507253409|508253489
DT4050|510242647|507253411
DT4051|509231282|508253492
DT4052|510231454|510242704
DT4053|507242355|505253285
DT4054|504264199|508253488
DT4055|504253164|503242001
DT4056|504253178|503242005
DT4062|507253398|511231531
DT4063|505253281|508253490
DT4072|509253616|510242700
DT4074|504253165|508253483
DT4088|502241854|512253856
DT4089|512253896|510242663
DT4090|512253892|510242699
DT4091|510242657|503242034
DT4092|502241849|510242682
DT4093|509253662|510253672
DT4094|512253864|510242702
DT4095|512253863|501241758
DT4097|510231424|504264197
DT4099|510231424|504264196
DT4601|508231161|508231242
DT4602|510231426|50423885
DT4603|50423857|50423914
DT4604|502264075|508231136
DT4605||50423916
DT4606|504264198|51222554
DT5107|510253698|508253570
DT5108|509253612|510242716
DT5109|50423913|509242558
DT5110|510253700|50323701
DT5111|501241752|50623986
DT5112|504253161|506253380
DT5113|508253583|508253571
DT5116|510253699|508253574
EX5002|503242045|505242194
EX5003|50323736|51122485
EX5005|502264052|50523938
EX5006|502264071|502264029
EX6001|50523958|501241751
EX6002|50822396|51222532
EX6003|502264043|50322247
EX7001|512231663|511231526
EX7002|51122450|50721060
EX7003|507242409|501241730
EX7004|50222222|50721063
EX7005|50123600|50721065
EX7006|508242476|50721064
EX7007|508231115|506242279
EX7008|507231106|51222500
EX7009|508231151|509253615
EX7010|509253651|50822399
EX8001|508231108|511231594
RD4008|502241880|506253346
RD4011|505253271|509242570
RD4012|506242259|
RD4015|50423904|505242184
RD4017|510231462|50423825
RD4022|509242555|
RD4025|506253348|501241734
RD4027|506253353|505253269
RD5001|502241891|505264304
RD5002|503264164|502241862
RD5003|511231566|503264119
RD5004|507231105|501241748
RD5005|507242343|501252937
RD5006|507242322|506242273
RD5008|511253815|503241971
RD5009|511231574|
RD5010|502241828|507242335
RD5011|511231550|507242334
RD5012|506253331|502241832
RD5013|504242064|502241811
RD5014|502241825|502241833
RD5015|502264106|505264305
RD5016|509253652|509253599
RD5018|506253371|506253378
RD5021|502264107|507242342
RD5022|506242282|505264306
RD5023|502264044|508242513
RD5024|507242325|502241861
RD5025|506231032|507231053
RD5026|511253816|506242264
RD5027|501241753|502241836
RD5029|508231185|507242318
RD5030|502264045|507242321
RD5031|511231525|511231532
RD5032|508231218|505264319
RD5033|512242891|501252939
RD5034|512231666|511231481
RD5035|504264269|503241966
RD5036|50722333|501241775
RD5037|512253865|501253017
RD5038|505253272|508242512
RD5039|507242399|50423895
RD5040|512253870|501241731
RD5041|510253697|501252938
RD5042|506242283|506242275
RD5043|507231051|506231036
RD5044|512253885|511231489
RD5045|501241782|512253866
RD5046|508242514|50423790
RD5047|511231515|501241785
RD5048|502241831|508253569
RD5049|50323715|511231561
RD5050|502264103|50223626
RD5051|506242272|506242263
RD5052|502241864|507242333
RD5053|506242286|508242531
RD5054|50523947|507242393
RD5055|506253368|50123611
RD5056|504242066|511231570
RD5057|502241868|507231076
RD5058|509253645|503241968
RD5059|512242854|502241805
RD5060|508242416|501252936
RD5061|504242127|51222536
RD5062|507242377|512231664
RD5063|505264277|507231100
RD5064|505253274|508231194
RD5065|50423849|50822388
RD5066|509242592|501241780
RD5067|512242897|509242557
RD5068|51122468|51222501
RD5069|506253370|51122472
RD5070||511231552
RD5071|508231207|
RD5072|50822375|
RD5073|50223665|501253016
RD5074|50223648|50223643
RD5075|51022448|50223661
RD5076|507242315|501241710
RD5078|50622310|50223651
RD5079|512242888|50323730
RD5080|503241972|511231554
RD5081|511231551|507231072
RD5082|506253369|50423896
RD5083|50423799|506231017
RD5084|51122466|507242317
RD5085|51022443|502253043
RD5086|50822392|508231206
RD5087|512242925|512242865
RD5088|506231005|509231375
RD5089|50323723|509253598
RD5090|511253817|506231048
RD5091|509242586|507253393
RD5092|51122456|505253226
RD5094|511231521|507253394
RD5095|51222535|504264247
RD5096|509253614|501263966
RD5097|50323777|51022426
RD5098|512253854|501252940
RD5099|51222526|507231074
RD5100|501241784|503264178
RD5102|50423864|50423869
RD5103|508231132|
RD5104|507242326|511231555
RD5105|509242587|509242584
RD5106|50323761|503264120`;

export type OperatorAlloc = {
  pagi: Record<string, string>;
  malam: Record<string, string>;
};

/* Alokasi nyata per shift — dipakai sebagai seed papan Fleet Allocation dan,
   lewat papan itu, oleh seluruh layar display. */
export const operatorAllocSeed: OperatorAlloc = (() => {
  const pagi: Record<string, string> = {};
  const malam: Record<string, string> = {};
  for (const line of rawAlloc.split("\n")) {
    const [unit, p, m] = line.split("|");
    if (p) pagi[unit] = p;
    if (m) malam[unit] = m;
  }
  return { pagi, malam };
})();

/* Kompetensi diturunkan dari unit yang dioperasikan operator itu di kedua
   shift: satu entri per Type EGI, tanpa duplikat. */
const egiByCode = new Map(unitsDb.map((u) => [u.code, u.egi]));
/* eq class unit → field `eq` kompetensi ("Pilih Kompetensi") */
const clsByCode = new Map(unitsDb.map((u) => [u.code, u.cls]));
const kompByNik = (() => {
  const out = new Map<string, Komp[]>();
  for (const map of [operatorAllocSeed.pagi, operatorAllocSeed.malam]) {
    for (const [unit, nik] of Object.entries(map)) {
      const egi = egiByCode.get(unit);
      if (!egi) continue;
      const cls = typeOfEgi(egi);
      const list = out.get(nik) ?? [];
      if (!list.some((k) => k.cls === cls))
        list.push({
          cls,
          eq: clsByCode.get(unit) ?? "",
          simper: "Kelas B",
          exp: "2027-06-30",
        });
      out.set(nik, list);
    }
  }
  return out;
})();

/* Nilai deterministik dari NIK — tidak acak, supaya render server & klien
   selalu sama dan tidak ada hydration mismatch. */
function pick<T>(nik: string, list: T[]): T {
  let h = 0;
  for (let i = 0; i < nik.length; i++) h = (h * 31 + nik.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

const MESS = ["Mess 31", "Mess 32", "Mess 33", "Mess Sebatik"];
const BLOOD = ["A", "B", "AB", "O"];
const MCU = ["Fit", "Fit with note"];

export const operatorSeed: Employee[] = rawOps.split("\n").map((line) => {
  const [nik, name] = line.split("|");
  const komp = kompByNik.get(nik) ?? [];
  return {
    name,
    nik,
    dept: "Operation",
    pos: komp.length ? `Operator ${komp[0].cls}` : "Operator",
    simper: komp.length ? "Kelas B" : "",
    simperExp: "2027-06-30",
    status: "aktif" as const,
    company: "PT Unggul Dinamika Utama",
    equip: komp.map((k) => k.cls).join(", "),
    join: "2024-01-15",
    exp: "",
    license: "SIM B2 Umum",
    mcu: pick(nik, MCU),
    medis: "",
    blood: pick(nik, BLOOD),
    bpjs: "Aktif",
    mess: pick(nik, MESS),
    kamar: String((Number(nik.slice(-3)) % 40) + 1).padStart(2, "0"),
    hp: "",
    emg: "",
    komp,
  };
});
