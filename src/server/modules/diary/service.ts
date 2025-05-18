import { DatabaseAccessor } from '@/server/lib/sqlite';
import dayjs from 'dayjs';
import {
  DiaryExportReqData,
  DiaryUpdateReqData,
  JsonImportForm,
  JsonImportResult,
  SearchDiaryReqData,
  SearchDiaryResp,
} from '@/types/diary';
import { PAGE_SIZE } from '@/config';
import { readFile } from 'fs/promises';

interface Props {
  db: DatabaseAccessor;
}

export const createDiaryService = (props: Props) => {
  const { db } = props;

  const getMonthList = async (month: string, userId: number) => {
    const diaryDate = dayjs(month, 'YYYYMM');
    const queryRange: [number, number] = [
      // 前后扩张3天，防止因为跨时区出现某月第一天获取不到的问题
      diaryDate.startOf('M').subtract(3, 'd').valueOf(),
      diaryDate.endOf('M').add(3, 'day').valueOf(),
    ];

    const originDiarys = await db
      .diary()
      .select('date', 'content', 'color')
      .where('createUserId', userId)
      .andWhereBetween('date', queryRange)
      .orderBy('date', 'asc');

    return { code: 200, data: originDiarys };
  };

  const getDetail = async (date: number, userId: number) => {
    const detail = await db
      .diary()
      .select('date', 'content', 'color')
      .where('createUserId', userId)
      .andWhere('date', date)
      .first();

    return { code: 200, data: detail || { content: '', color: '' } };
  };

  const updateDetail = async (detail: DiaryUpdateReqData, userId: number) => {
    const oldDiary = await db
      .diary()
      .select('content', 'color')
      .where('date', detail.date)
      .andWhere('createUserId', userId)
      .first();
    if (!oldDiary) {
      await db.diary().insert({ ...detail, createUserId: userId });
      return { code: 200 };
    }

    await db
      .diary()
      .update({ ...oldDiary, ...detail })
      .where('date', detail.date)
      .andWhere('createUserId', userId);
    return { code: 200 };
  };

  const serachDiary = async (reqData: SearchDiaryReqData, userId: number) => {
    const { page = 1, colors = [], keyword, desc = true } = reqData;
    const query = db.diary().select().where('createUserId', userId);

    if (colors.length > 0) {
      query.whereIn('color', colors);
    }

    if (keyword) {
      query.andWhereLike('content', `%${keyword}%`);
    }

    const { count: total } = (await query.clone().count('id as count').first()) as any;

    const result = await query
      .orderBy('date', desc ? 'desc' : 'asc')
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    const data: SearchDiaryResp = { total, rows: result };

    return { code: 200, data };
  };

  const importDiary = async (filePath: string, config: JsonImportForm, userId: number) => {
    const jsonFile = await readFile(filePath);
    const jsonContent = JSON.parse(jsonFile.toString());

    // 检查是否有重复的日记
    const needImportDiarys: number[] = [];
    for (const diary of jsonContent) {
      const date = diary[config.dateKey];
      if (!date) {
        return { code: 400, msg: '导入的日记中没有日期字段' };
      }

      needImportDiarys.push(dayjs(date, config.dateFormatter).valueOf());
    }

    const existDiarys = await db
      .diary()
      .select('date', 'content')
      .whereIn('date', needImportDiarys)
      .andWhere('createUserId', userId);
    const existDiaryMap = new Map(existDiarys.map((d) => [d.date, d]));

    const insertDiarys = [];
    const updateDiarys = [];

    for (const diary of jsonContent) {
      const date = dayjs(diary[config.dateKey]).valueOf();
      const content = diary[config.contentKey];
      const color = diary[config.colorKey];

      // 新增
      const existDiary = existDiaryMap.get(date);
      if (!existDiary) {
        insertDiarys.push({ date, content, color, createUserId: userId });
        continue;
      }

      // 编辑
      const newData = { ...existDiary, content, color };
      if (config.existOperation === 'cover') newData.content = content;
      else if (config.existOperation === 'merge')
        newData.content = `${existDiary.content}\n${content}`;
      else if (config.existOperation === 'skip') continue;
      updateDiarys.push(newData);
    }

    // 批量插入
    for (const diary of insertDiarys) {
      await db.diary().insert(diary);
    }

    // 批量更新
    for (const diary of updateDiarys) {
      await db.diary().where('date', diary.date).andWhere('createUserId', userId).update(diary);
    }

    const result: JsonImportResult = {
      insertCount: insertDiarys.length,
      updateCount: updateDiarys.length,
      insertNumber: insertDiarys.map((d) => d.content.length).reduce((a, b) => a + b, 0),
    };

    return { code: 200, data: result };
  };

  //AI-Generated: Cursor
  //Prompt: add a new function to handle PDF export

  const exportDiary = async (config: DiaryExportReqData, userId: number) => {
    const { range, startDate, endDate } = config;

    let query = db.diary().select('date', 'content', 'color').where('createUserId', userId);
    if (range === 'part' && startDate && endDate) {
      const startTime = dayjs(startDate).startOf('day').valueOf();
      const endTime = dayjs(endDate).endOf('day').valueOf();
      query = query.whereBetween('date', [startTime, endTime]);
    }

    const data = await query.orderBy('date', 'desc');
    return data.map((diary) => ({
      [config.dateKey]: dayjs(diary.date).format(config.dateFormatter),
      [config.contentKey]: diary.content,
      [config.colorKey]: diary.color,
    }));
  };

  /**
   * 导出日记为PDF
   */
  const exportDiaryAsPdf = async (config: DiaryExportReqData, userId: number) => {
    const { range, startDate, endDate } = config;

    let query = db.diary().select('date', 'content', 'color').where('createUserId', userId);
    if (range === 'part' && startDate && endDate) {
      const startTime = dayjs(startDate).startOf('day').valueOf();
      const endTime = dayjs(endDate).endOf('day').valueOf();
      query = query.whereBetween('date', [startTime, endTime]);
    }

    const data = await query.orderBy('date', 'asc');
    
    // Generate HTML content for the PDF
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>方块日记导出</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          line-height: 1.6;
        }
        .diary-entry {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .diary-date {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #ccc;
        }
        .diary-content {
          margin-bottom: 20px;
        }
        .diary-content img {
          max-width: 100%;
          height: auto;
        }
        .diary-color {
          width: 15px;
          height: 15px;
          display: inline-block;
          border-radius: 50%;
          margin-right: 10px;
        }
        h1, h2, h3, h4, h5, h6 {
          margin-top: 20px;
          margin-bottom: 10px;
        }
        blockquote {
          border-left: 3px solid #ccc;
          padding-left: 10px;
          color: #666;
          margin: 10px 0;
        }
        pre, code {
          background-color: #f5f5f5;
          border-radius: 3px;
          padding: 2px 5px;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 20px 0;
        }
        table, th, td {
          border: 1px solid #ddd;
        }
        th, td {
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
        }
      </style>
    </head>
    <body>
      <h1>方块日记导出</h1>
      <div class="export-info">
        <p>导出时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
        <p>日记条目数: ${data.length}</p>
      </div>
      <div class="diary-entries">
    `;

    // Add each diary entry to the HTML content
    for (const diary of data) {
      // Convert the Markdown content to HTML
      let processedContent = diary.content;
      
      // Simple markdown to HTML conversion for basic formatting
      // This is a simplified version - a real implementation should use a proper markdown parser
      processedContent = processedContent
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
        .replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
        .replace(/^##### (.*?)$/gm, '<h5>$1</h5>')
        .replace(/^###### (.*?)$/gm, '<h6>$1</h6>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" />')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
        .replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>')
        .replace(/\n/g, '<br />');

      const dateStr = dayjs(diary.date).format('YYYY-MM-DD');
      const colorStyle = diary.color ? `background-color: ${diary.color};` : 'display: none;';

      html += `
        <div class="diary-entry">
          <div class="diary-date">
            <span class="diary-color" style="${colorStyle}"></span>
            ${dateStr}
          </div>
          <div class="diary-content">
            ${processedContent}
          </div>
        </div>
      `;
    }

    html += `
      </div>
    </body>
    </html>
    `;

    return html;
  };

  return {
    getMonthList,
    getDetail,
    updateDetail,
    serachDiary,
    importDiary,
    exportDiary,
    exportDiaryAsPdf
  };
};

export type TagService = ReturnType<typeof createDiaryService>;
