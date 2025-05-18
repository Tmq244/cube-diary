import React, { FC, useState } from 'react';
import { Button, Card, Col, DatePicker, Form, Input, Radio, Row, Space } from 'antd';
import { useExportDiary, exportPdf } from '@/client/services/diary';
import s from './styles.module.css';

import dayjs, { Dayjs } from 'dayjs';
import { DiaryExportReqData } from '@/types/diary';
import Preview from '../monthList/preview';
import { ActionButton, ActionIcon, PageAction, PageContent } from '@/client/layouts/pageWithAction';
import { LeftOutlined } from '@ant-design/icons';
import { SettingContainerProps } from '@/client/components/settingContainer';
import { messageSuccess } from '@/client/utils/message';
import { useIsMobile } from '@/client/layouts/responsive';

type JsonExportForm = Omit<DiaryExportReqData, 'startDate' | 'endDate'> & {
  startDate: Dayjs;
  endDate: Dayjs;
};

const saveAsJson = (data: any, fileName = 'data.json') => {
  const dataStr = JSON.stringify(data);
  const blob = new Blob([dataStr], { type: 'text/json' });
  const a = document.createElement('a');
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
  a.click();
};

//AI-Generated: Cursor
//Prompt: add a new function to handle PDF export

// Function to handle PDF download
const downloadPdf = (blob: Blob, filename = 'diary.pdf') => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

/**
 * 为导入导出 json 创建示例
 */
const createExample = (formValues: JsonExportForm): string => {
  const newExamples = Array.from({ length: 3 }).map((_, index) => {
    const date = dayjs().subtract(index, 'd').startOf('day');
    return {
      [formValues.dateKey || 'date']: formValues.dateFormatter
        ? date.format(formValues.dateFormatter)
        : date.valueOf(),
      [formValues.contentKey || 'content']: `这是 ${date.format('YYYY 年 MM 月 DD 日的一篇日记')}`,
      [formValues.colorKey || 'color']: `c0${index + 1}`,
    };
  });

  return '```json\n' + JSON.stringify(newExamples, null, 2) + '\n```';
};

const getFormInitialValues = (): JsonExportForm => {
  return {
    range: 'part',
    startDate: dayjs().subtract(1, 'month'),
    endDate: dayjs(),
    dateKey: 'date',
    contentKey: 'content',
    colorKey: 'color',
    dateFormatter: 'YYYY-MM-DD',
    format: 'json', // Add default format as JSON
  };
};

const initialValues = getFormInitialValues();

export const Content: FC<SettingContainerProps> = (props) => {
  const [form] = Form.useForm();
  const isMobile = useIsMobile();
  /** 和用户配置项相符的示例 */
  const [example, setExample] = useState(() => createExample(getFormInitialValues()));
  /** 上传接口 */
  const { mutateAsync: exportJson, isLoading } = useExportDiary();
  /** 是否为范围导出 */
  const isRangeExport = Form.useWatch('range', form) === 'part';
  /** 导出格式 */
  const exportFormat = Form.useWatch('format', form);

  const onFormValueChange = (values: Partial<JsonExportForm>, allValues: JsonExportForm) => {
    const newExample = createExample(allValues);
    setExample(newExample);
  };

  const onExport = async () => {
    const values = await form.validateFields();
    const { startDate, endDate, format, ...rest } = values;
    const reqData: DiaryExportReqData = { ...rest, format };

    if (reqData.range === 'part') {
      reqData.startDate = startDate.format('YYYY-MM-DD');
      reqData.endDate = endDate.format('YYYY-MM-DD');
    }

    if (format === 'pdf') {
      try {
        // Use the service function that includes headers
        const blob = await exportPdf(reqData);
        downloadPdf(blob, 'diary.pdf');
        messageSuccess('PDF导出成功');
        return true;
      } catch (error) {
        console.error('PDF export error:', error);
        return false;
      }
    } else {
      const resp = await exportJson(reqData);
      messageSuccess('导出成功');
      saveAsJson(resp, 'diary.json');
      return resp.code === 200;
    }
  };

  //AI-Generated: Cursor
  //Prompt: add a new function to handle PDF export

  const renderContent = () => {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} md={24} lg={12}>
          <Card size='small' title='导出配置'>
            <Form
              className={s.importDiaryBox}
              form={form}
              initialValues={initialValues}
              onValuesChange={onFormValueChange}
              labelAlign='left'>
              <Row gutter={[16, 16]}>
                <Col span={9}>导出格式</Col>
                <Col span={15}>
                  <Form.Item name='format' noStyle>
                    <Radio.Group className='float-right'>
                      <Radio value='json'>JSON</Radio>
                      <Radio value='pdf'>PDF</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={9}>导出范围</Col>
                <Col span={15}>
                  <Form.Item name='range' noStyle>
                    <Radio.Group className='float-right'>
                      <Radio value='all'>全部</Radio>
                      <Radio value='part'>部分</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                {isRangeExport && (
                  <>
                    <Col span={9}>开始日期</Col>
                    <Col span={15}>
                      <Form.Item
                        name='startDate'
                        noStyle
                        rules={[{ required: true, message: '请选择开始日期' }]}>
                        <DatePicker className='w-full' />
                      </Form.Item>
                    </Col>
                    <Col span={9}>结束日期</Col>
                    <Col span={15}>
                      <Form.Item
                        name='endDate'
                        noStyle
                        rules={[{ required: true, message: '请选择结束日期' }]}>
                        <DatePicker className='w-full' />
                      </Form.Item>
                    </Col>
                  </>
                )}
                {exportFormat === 'json' && (
                  <>
                    <Col span={9}>日期字段名</Col>
                    <Col span={15}>
                      <Form.Item
                        name='dateKey'
                        noStyle
                        rules={[{ required: true, message: '请填写日期字段名' }]}>
                        <Input placeholder='date' />
                      </Form.Item>
                    </Col>
                    <Col span={9}>日期格式</Col>
                    <Col span={15}>
                      <Form.Item
                        name='dateFormatter'
                        noStyle
                        rules={[{ required: true, message: '请填写日期格式' }]}>
                        <Input placeholder='YYYY-MM-DD' />
                      </Form.Item>
                    </Col>
                    <Col span={9}>内容字段名</Col>
                    <Col span={15}>
                      <Form.Item
                        name='contentKey'
                        noStyle
                        rules={[{ required: true, message: '请填写内容字段名' }]}>
                        <Input placeholder='content' />
                      </Form.Item>
                    </Col>
                    <Col span={9}>颜色字段名</Col>
                    <Col span={15}>
                      <Form.Item
                        name='colorKey'
                        noStyle
                        rules={[{ required: true, message: '请填写颜色字段名' }]}>
                        <Input placeholder='color' />
                      </Form.Item>
                    </Col>
                  </>
                )}
              </Row>
            </Form>
          </Card>
        </Col>

        {exportFormat === 'json' && (
          <Col xs={24} md={24} lg={12}>
            <Card size='small' title='预览'>
              <div className={s.jsonExample}>
                <pre>{JSON.stringify(example, null, 2)}</pre>
              </div>
              <Preview value='# 示例日记\n\n这是一篇示例日记，导出后的数据结构如下。' />
            </Card>
          </Col>
        )}
        
        {exportFormat === 'pdf' && (
          <Col xs={24} md={24} lg={12}>
            <Card size='small' title='PDF导出说明'>
              <div className="p-4">
                <p>PDF导出将生成一个包含所选时间范围内所有日记条目的PDF文档。</p>
                <p>文档将按照日期排序，并包含每篇日记的内容。</p>
                <p>导出的PDF文件可用于打印或长期存档您的日记内容。</p>
              </div>
            </Card>
          </Col>
        )}
      </Row>
    );
  };

  if (!isMobile) {
    return (
      <>
        {renderContent()}
        <div className='flex flex-row-reverse mt-4'>
          <Space>
            <Button onClick={props.onClose}>返回</Button>
            <Button type='primary' onClick={onExport} loading={isLoading}>
              导出
            </Button>
          </Space>
        </div>
      </>
    );
  }

  return (
    <>
      <PageContent>
        <div className='m-4 md:m-0'>
          <Card size='small' className='text-center text-base font-bold mb-4'>
            {props.title}
          </Card>
          {renderContent()}
        </div>
      </PageContent>

      <PageAction>
        <ActionIcon icon={<LeftOutlined />} onClick={props.onClose} />
        <ActionButton onClick={onExport} loading={isLoading}>
          导出
        </ActionButton>
      </PageAction>
    </>
  );
};
