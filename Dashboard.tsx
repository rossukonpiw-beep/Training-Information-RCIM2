import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend
} from 'recharts';
import { 
  BookOpenCheck, Clock, Coins, TrendingUp, Users, Building2, Award, Plus
} from 'lucide-react';
import { TrainingRecord } from '../types';

interface DashboardProps {
  records: TrainingRecord[];
  onOpenForm: () => void;
  onSelectCategoryFilter: (category: string) => void;
}

const CATEGORY_COLORS = [
  '#0F2C59', '#3B82F6', '#10B981', '#8B5CF6', 
  '#F59E0B', '#EC4899', '#64748B'
];

export const Dashboard: React.FC<DashboardProps> = ({
  records,
  onOpenForm,
  onSelectCategoryFilter
}) => {
  // Calculations
  const totalRecords = records.length;
  const totalHours = records.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
  const totalExpense = records.reduce((acc, curr) => acc + (Number(curr.expense) || 0), 0);
  
  const avgBefore = totalRecords > 0 
    ? (records.reduce((acc, curr) => acc + curr.knowledgeBefore, 0) / totalRecords).toFixed(1)
    : '0';
  const avgAfter = totalRecords > 0 
    ? (records.reduce((acc, curr) => acc + curr.knowledgeAfter, 0) / totalRecords).toFixed(1)
    : '0';
  const avgDiff = (Number(avgAfter) - Number(avgBefore)).toFixed(1);

  // Categories Distribution Data
  const categoryCounts: Record<string, number> = {};
  records.forEach(r => {
    (r.categories || []).forEach(cat => {
      // Shorten display name for chart
      const shortCat = cat.replace('ด้าน', '').trim();
      categoryCounts[shortCat] = (categoryCounts[shortCat] || 0) + 1;
    });
  });

  const categoryChartData = Object.keys(categoryCounts).map((key, idx) => ({
    name: key,
    value: categoryCounts[key],
    fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
  }));

  // Staff Type Distribution Data
  const academicCount = records.filter(r => r.staffType === 'academic').length;
  const supportCount = records.filter(r => r.staffType === 'support').length;

  const staffTypeData = [
    { name: 'สายวิชาการ (อาจารย์)', value: academicCount, fill: '#0F2C59' },
    { name: 'สายสนับสนุน', value: supportCount, fill: '#D97706' }
  ];

  // Campus Distribution Data
  const campusCounts: Record<string, number> = {
    'ศาลายา': 0,
    'วังไกลกังวล': 0
  };
  records.forEach(r => {
    if (r.campus === 'วังไกลกังวล') {
      campusCounts['วังไกลกังวล'] += 1;
    } else {
      campusCounts['ศาลายา'] += 1;
    }
  });

  const campusChartData = [
    { name: 'ศาลายา', count: campusCounts['ศาลายา'] },
    { name: 'วังไกลกังวล', count: campusCounts['วังไกลกังวล'] }
  ];

  // Calculations of Knowledge Before-After split by Staff Type
  const academicRecords = records.filter(r => r.staffType === 'academic');
  const supportRecords = records.filter(r => r.staffType === 'support');

  const academicBeforeAvg = academicRecords.length > 0
    ? Number((academicRecords.reduce((acc, curr) => acc + curr.knowledgeBefore, 0) / academicRecords.length).toFixed(2))
    : 0;
  const academicAfterAvg = academicRecords.length > 0
    ? Number((academicRecords.reduce((acc, curr) => acc + curr.knowledgeAfter, 0) / academicRecords.length).toFixed(2))
    : 0;

  const supportBeforeAvg = supportRecords.length > 0
    ? Number((supportRecords.reduce((acc, curr) => acc + curr.knowledgeBefore, 0) / supportRecords.length).toFixed(2))
    : 0;
  const supportAfterAvg = supportRecords.length > 0
    ? Number((supportRecords.reduce((acc, curr) => acc + curr.knowledgeAfter, 0) / supportRecords.length).toFixed(2))
    : 0;

  const academicDiff = (academicAfterAvg - academicBeforeAvg).toFixed(2);
  const supportDiff = (supportAfterAvg - supportBeforeAvg).toFixed(2);

  // Knowledge comparison data for BarChart
  const staffKnowledgeComparisonData = [
    {
      name: 'สายวิชาการ (อาจารย์ประจำ)',
      ก่อนอบรม: academicBeforeAvg,
      หลังอบรม: academicAfterAvg,
      จำนวนคน: academicRecords.length
    },
    {
      name: 'สายสนับสนุน (เจ้าหน้าที่)',
      ก่อนอบรม: supportBeforeAvg,
      หลังอบรม: supportAfterAvg,
      จำนวนคน: supportRecords.length
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2 border border-amber-500/30">
              <Award className="w-3.5 h-3.5" /> ภาพรวมผลงานพัฒนาบุคลากร RCIM
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              แดชบอร์ดสรุปสถิติการฝึกอบรม
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              รายงานผลการพัฒนาศักยภาพบุคลากรสายวิชาการและสายสนับสนุน วิทยาลัยนวัตกรรมการจัดการ มทร.รัตนโกสินทร์
            </p>
          </div>
          <button
            onClick={onOpenForm}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all border border-amber-300/30 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มบันทึกการอบรม</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Records */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">โครงการอบรมทั้งหมด</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <BookOpenCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalRecords}</span>
            <span className="text-xs text-slate-500 font-medium">หลักสูตร/โครงการ</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>สายวิชาการ {academicCount} / สายสนับสนุน {supportCount}</span>
          </div>
        </div>

        {/* Card 2: Total Hours */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">ชั่วโมงการอบรมสะสม</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalHours}</span>
            <span className="text-xs text-slate-500 font-medium">ชั่วโมง</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            เฉลี่ย {(totalRecords > 0 ? (totalHours / totalRecords).toFixed(1) : 0)} ชม. / โครงการ
          </div>
        </div>

        {/* Card 3: Total Budget */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">งบประมาณรวมที่ใช้</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900">{totalExpense.toLocaleString('th-TH')}</span>
            <span className="text-xs text-slate-500 font-medium">บาท</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <span>เบิกจ่ายงบพัฒนาบุคลากรวิทยาลัย</span>
          </div>
        </div>

        {/* Card 4: Knowledge Improvement */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">ระดับความรู้เพิ่มขึ้น</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">+{avgDiff}</span>
            <span className="text-xs text-slate-500 font-medium">ระดับ (เต็ม 5)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>ก่อน: {avgBefore}/5</span>
            <span className="text-emerald-600 font-semibold">หลัง: {avgAfter}/5</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1: Category Distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">การพัฒนาตามหมวดหมู่ 7 ด้าน</h3>
              <p className="text-xs text-slate-500">จำนวนโครงการแบ่งตามยุทธศาสตร์การพัฒนาตนเอง</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} โครงการ`, 'จำนวน']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categoryChartData.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onSelectCategoryFilter(item.name)}
                className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-slate-700">{item.name} ({item.value})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chart 2: Knowledge Assessment Before vs After */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">เปรียบเทียบระดับความรู้ ก่อน - หลัง อบรม (แยกตามสายงาน)</h3>
              <p className="text-xs text-slate-500">ค่าเฉลี่ยระดับความรู้และประสิทธิผลแยกรายกลุ่มสายวิชาการและสายสนับสนุน</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffKnowledgeComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                <Tooltip formatter={(value) => [`${value} คะแนน`, '']} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ก่อนอบรม" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="หลังอบรม" fill="#0F2C59" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
            <div className="text-center bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 block">สายวิชาการพัฒนา</span>
              <span className="text-sm font-extrabold text-blue-950 block mt-0.5">+{academicDiff} ระดับ</span>
              <span className="text-[10px] text-slate-500">ก่อน {academicBeforeAvg} ➔ หลัง {academicAfterAvg}</span>
            </div>
            <div className="text-center bg-amber-50/40 rounded-xl p-2.5 border border-amber-100">
              <span className="text-[11px] font-bold text-amber-800 block">สายสนับสนุนพัฒนา</span>
              <span className="text-sm font-extrabold text-amber-900 block mt-0.5">+{supportDiff} ระดับ</span>
              <span className="text-[10px] text-amber-700">ก่อน {supportBeforeAvg} ➔ หลัง {supportAfterAvg}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Campus & Staff Type Secondary Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Staff Type Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-900" />
              <span>สัดส่วนตามประเภทบุคลากร (Academic vs Support)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              จำแนกอาจารย์สายวิชาการสังกัดหลักสูตร และเจ้าหน้าที่สายสนับสนุนกลุ่มงาน
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
              <span className="text-xs font-semibold text-slate-500 block">สายวิชาการ (อาจารย์ประจำ)</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{academicCount} ท่าน</span>
              <span className="text-xs text-blue-600 font-medium">
                ({totalRecords > 0 ? Math.round((academicCount / totalRecords) * 100) : 0}% ของทั้งหมด)
              </span>
            </div>
            <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200 text-center">
              <span className="text-xs font-semibold text-amber-800 block">สายสนับสนุน (เจ้าหน้าที่)</span>
              <span className="text-2xl font-black text-amber-950 mt-1 block">{supportCount} ท่าน</span>
              <span className="text-xs text-amber-700 font-medium">
                ({totalRecords > 0 ? Math.round((supportCount / totalRecords) * 100) : 0}% ของทั้งหมด)
              </span>
            </div>
          </div>
        </div>

        {/* Campus Distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-700" />
            <span>การอบรมแยกตามพื้นที่สังกัด (Campus)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            พื้นที่ศาลายา และพื้นที่วิทยาเขตวังไกลกังวล
          </p>
          <div className="mt-4 space-y-3">
            {campusChartData.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="text-slate-900">{item.count} โครงการ</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                    style={{ width: `${totalRecords > 0 ? (item.count / totalRecords) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
